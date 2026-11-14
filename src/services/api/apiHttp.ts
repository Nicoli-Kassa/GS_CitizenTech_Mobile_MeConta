import { Directory, File, Paths } from 'expo-file-system';

import type {
  ArquivoLocal,
  Categoria,
  Convite,
  Envio,
  FamiliaDetalhe,
  FamiliaResumo,
  Idoso,
  IdosoRequest,
  IndicadorConversas,
  ListaPaginada,
  Membro,
  NovaResposta,
  Pagina,
  Pergunta,
  PerguntaDaSemana,
  Sessao,
  StatusEnvio,
} from '../../types/api';
import { ApiError } from '../../utils/errors';
import { readProblemDetail } from '../../utils/parse';
import type { ApiMeConta } from './contrato';
import {
  parseCategoria,
  parseConvite,
  parseEnvio,
  parseFamiliaDetalhe,
  parseFamiliaResumo,
  parseIdoso,
  parseIndicador,
  parseListaDePaginas,
  parseMembro,
  parsePagina,
  parsePergunta,
  parsePerguntaDaSemana,
  parsers,
  parseSessao,
} from './parsers';

/** Tempo máximo de espera. O upload de áudio pode levar mais. */
const TEMPO_LIMITE_MS = 20000;
const TEMPO_LIMITE_UPLOAD_MS = 90000;

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Item de arquivo no FormData do React Native (endereço local + nome + tipo). */
type ParteDeArquivo = { uri: string; name: string; type: string };

function parteDeArquivo(arquivo: ArquivoLocal): ParteDeArquivo {
  return { uri: arquivo.uri, name: arquivo.nome, type: arquivo.tipo };
}

/** Mensagem para cada situação, quando a API não manda uma própria. */
function mensagemAmigavel(status: number, body: unknown): string {
  if (status === 401) {
    return 'Sua sessão expirou. Entre de novo.';
  }
  if (status >= 500) {
    return 'O servidor do Me Conta está com problemas. O que você fizer fica guardado no celular.';
  }
  return readProblemDetail(body) ?? 'Não foi possível concluir. Tente de novo.';
}

/**
 * Cliente da API em C# (`/api/v1`).
 *
 * Toda chamada leva `Authorization: Bearer <token>` e os erros chegam no
 * formato ProblemDetails, com a mensagem pronta no campo `detail`.
 */
export class ApiHttp implements ApiMeConta {
  readonly nome = 'api' as const;
  private token: string | null = null;

  constructor(private readonly baseUrl: string) {}

  definirToken(token: string | null): void {
    this.token = token;
  }

  private async requisicao(
    caminho: string,
    metodo: Metodo,
    corpo?: object | FormData,
    tempoLimite = TEMPO_LIMITE_MS,
  ): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), tempoLimite);
    const ehFormulario = corpo instanceof FormData;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (corpo && !ehFormulario) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : ehFormulario ? corpo : JSON.stringify(corpo),
        signal: controller.signal,
      });
      const texto = await response.text();
      const body: unknown = texto.length > 0 ? JSON.parse(texto) : null;
      if (!response.ok) {
        throw new ApiError(response.status, mensagemAmigavel(response.status, body));
      }
      return { status: response.status, body };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Sem resposta: sem internet, API desligada ou tempo esgotado.
      throw new ApiError(0, 'Não foi possível falar com o servidor do Me Conta.');
    } finally {
      clearTimeout(timer);
    }
  }

  private async get(caminho: string): Promise<unknown> {
    return (await this.requisicao(caminho, 'GET')).body;
  }

  private async post(caminho: string, corpo?: object): Promise<unknown> {
    return (await this.requisicao(caminho, 'POST', corpo ?? {})).body;
  }

  async entrar(email: string, senha: string): Promise<Sessao> {
    try {
      return parseSessao(await this.post('/api/v1/auth/login', { email, password: senha }));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        throw new ApiError(401, 'E-mail ou senha incorretos.');
      }
      throw error;
    }
  }

  async cadastrar(email: string, senha: string): Promise<void> {
    await this.post('/api/v1/auth/register', { email, password: senha });
  }

  async criarPerfil(nome: string): Promise<Membro> {
    return parseMembro(await this.post('/api/v1/membros', { nome }));
  }

  async obterPerfil(): Promise<Membro> {
    return parseMembro(await this.get('/api/v1/membros/eu'));
  }

  async listarFamilias(): Promise<FamiliaResumo[]> {
    return parsers.lista(await this.get('/api/v1/familias'), parseFamiliaResumo);
  }

  async criarFamilia(nome: string): Promise<FamiliaResumo> {
    return parseFamiliaResumo(await this.post('/api/v1/familias', { nome }));
  }

  async obterFamilia(familiaId: number): Promise<FamiliaDetalhe> {
    return parseFamiliaDetalhe(await this.get(`/api/v1/familias/${familiaId}`));
  }

  async gerarConvite(familiaId: number): Promise<Convite> {
    return parseConvite(await this.post(`/api/v1/familias/${familiaId}/convites`));
  }

  async aceitarConvite(codigo: string): Promise<FamiliaDetalhe> {
    return parseFamiliaDetalhe(await this.post(`/api/v1/convites/${encodeURIComponent(codigo)}/aceitar`));
  }

  async cadastrarIdoso(familiaId: number, dados: IdosoRequest): Promise<Idoso> {
    return parseIdoso(await this.post(`/api/v1/familias/${familiaId}/idosos`, dados));
  }

  async atualizarIdoso(idosoId: number, dados: IdosoRequest): Promise<Idoso> {
    return parseIdoso((await this.requisicao(`/api/v1/idosos/${idosoId}`, 'PUT', dados)).body);
  }

  async concluirRoteiro(idosoId: number): Promise<Idoso> {
    return parseIdoso(await this.post(`/api/v1/idosos/${idosoId}/roteiro-concluido`));
  }

  async listarCategorias(): Promise<Categoria[]> {
    return parsers.lista(await this.get('/api/v1/categorias'), parseCategoria);
  }

  async listarPerguntas(idosoId: number, categoriaSlug?: string): Promise<Pergunta[]> {
    const filtro = categoriaSlug ? `?categoria=${encodeURIComponent(categoriaSlug)}` : '';
    return parsers.lista(await this.get(`/api/v1/idosos/${idosoId}/perguntas${filtro}`), parsePergunta);
  }

  async criarPergunta(familiaId: number, texto: string, categoriaId: number): Promise<Pergunta> {
    return parsePergunta(await this.post(`/api/v1/familias/${familiaId}/perguntas`, { texto, categoriaId }));
  }

  async obterPerguntaDaSemana(idosoId: number): Promise<PerguntaDaSemana | null> {
    const { status, body } = await this.requisicao(`/api/v1/idosos/${idosoId}/pergunta-da-semana`, 'GET');
    return status === 204 || body === null ? null : parsePerguntaDaSemana(body);
  }

  async enviarPergunta(idosoId: number, perguntaId: number): Promise<Envio> {
    return parseEnvio(await this.post(`/api/v1/idosos/${idosoId}/envios`, { perguntaId }));
  }

  async listarEnvios(idosoId: number, status?: StatusEnvio): Promise<Envio[]> {
    const filtro = status ? `?status=${status}` : '';
    return parsers.lista(await this.get(`/api/v1/idosos/${idosoId}/envios${filtro}`), parseEnvio);
  }

  async guardarResposta(envioId: number, resposta: NovaResposta): Promise<Pagina> {
    const formulario = new FormData();
    // O React Native aceita { uri, name, type } como arquivo no FormData.
    formulario.append('Audio', parteDeArquivo(resposta.audio) as unknown as Blob);
    if (resposta.foto) {
      formulario.append('Foto', parteDeArquivo(resposta.foto) as unknown as Blob);
    }
    if (resposta.titulo) {
      formulario.append('Titulo', resposta.titulo);
    }
    formulario.append('DuracaoSegundos', String(Math.max(1, Math.round(resposta.duracaoSegundos))));
    formulario.append('ChaveIdempotencia', resposta.chaveIdempotencia);

    const { body } = await this.requisicao(
      `/api/v1/envios/${envioId}/pagina`,
      'POST',
      formulario,
      TEMPO_LIMITE_UPLOAD_MS,
    );
    return parsePagina(body);
  }

  async listarCaderno(familiaId: number, pagina: number, tamanho: number): Promise<ListaPaginada<Pagina>> {
    return parseListaDePaginas(
      await this.get(`/api/v1/familias/${familiaId}/caderno?pagina=${pagina}&tamanho=${tamanho}`),
    );
  }

  async apagarPagina(paginaId: number): Promise<void> {
    await this.requisicao(`/api/v1/paginas/${paginaId}`, 'DELETE');
  }

  async baixarArquivo(caminho: string, nomeLocal: string): Promise<string> {
    const pasta = new Directory(Paths.document, 'midia');
    pasta.create({ intermediates: true, idempotent: true });
    const destino = new File(pasta, nomeLocal);
    if (destino.exists) {
      return destino.uri;
    }
    const arquivo = await File.downloadFileAsync(`${this.baseUrl}${caminho}`, destino, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      idempotent: true,
    });
    return arquivo.uri;
  }

  async obterIndicador(): Promise<IndicadorConversas> {
    return parseIndicador(await this.get('/api/v1/indicadores/conversas-de-verdade'));
  }
}
