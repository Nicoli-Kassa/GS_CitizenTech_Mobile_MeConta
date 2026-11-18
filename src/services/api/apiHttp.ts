import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import type {
  AnalisePrivacidade,
  ArquivoLocal,
  Aviso,
  Categoria,
  Convite,
  Envio,
  ExplicacaoDeRisco,
  FamiliaDetalhe,
  FamiliaResumo,
  Idoso,
  IdosoRequest,
  IndicadorConversas,
  ListaPaginada,
  Membro,
  MemoriaDoBairro,
  NovaResposta,
  Pagina,
  Pergunta,
  PerguntaDaSemana,
  PortaRetrato,
  Publicacao,
  PublicarMemoriaRequest,
  Sessao,
  StatusEnvio,
} from '../../types/api';
import { ApiError } from '../../utils/errors';
import { isRecord, readProblemDetail } from '../../utils/parse';
import { PublicacaoRecusadaError, type ApiMeConta } from './contrato';
import {
  parseAnalise,
  parseAviso,
  parseCategoria,
  parseConvite,
  parseEnvio,
  parseExplicacao,
  parseFamiliaDetalhe,
  parseFamiliaResumo,
  parseIdoso,
  parseIndicador,
  parseListaDePaginas,
  parseMembro,
  parseMemoria,
  parsePagina,
  parsePergunta,
  parsePerguntaDaSemana,
  parsePortaRetrato,
  parsePublicacao,
  parsers,
  parseSessao,
} from './parsers';

/** Tempo máximo de espera. O upload de áudio e a explicação da IA podem levar mais. */
const TEMPO_LIMITE_MS = 20000;
const TEMPO_LIMITE_LONGO_MS = 90000;

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Item de arquivo no FormData do React Native (endereço local + nome + tipo). */
type ParteDeArquivo = { uri: string; name: string; type: string };

function parteDeArquivo(arquivo: ArquivoLocal): ParteDeArquivo {
  return { uri: arquivo.uri, name: arquivo.nome, type: arquivo.tipo };
}

/** Na versão web o FormData precisa do arquivo de verdade (Blob), não do endereço. */
async function anexarArquivo(formulario: FormData, campo: string, arquivo: ArquivoLocal): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(arquivo.uri)).blob();
    formulario.append(campo, blob, arquivo.nome);
    return;
  }
  // O React Native aceita { uri, name, type } como arquivo no FormData.
  formulario.append(campo, parteDeArquivo(arquivo) as unknown as Blob);
}

/** Mensagem para cada situação, quando a API não manda uma própria. */
function mensagemAmigavel(status: number, body: unknown): string {
  if (status === 401) {
    return 'Sua sessão expirou. Entre de novo.';
  }
  if (status === 429) {
    return 'Muitos pedidos seguidos. Espere um minuto e tente de novo.';
  }
  if (status >= 500) {
    return 'O servidor do Me Conta está com problemas. O que você fizer fica guardado no celular.';
  }
  return readProblemDetail(body) ?? 'Não foi possível concluir. Tente de novo.';
}

/**
 * Cliente da API em C# (`/api/v1`).
 *
 * Toda chamada leva `Authorization: Bearer <token>`. O token do ASP.NET Identity
 * vence em uma hora: quando a API responde 401, o cliente renova a sessão com o
 * refresh token uma vez e repete o pedido. Os erros chegam no formato
 * ProblemDetails, com a mensagem pronta no campo `detail`.
 */
export class ApiHttp implements ApiMeConta {
  readonly nome = 'api' as const;
  private sessao: Sessao | null = null;
  private renovacao: Promise<boolean> | null = null;
  private ouvinteDeRenovacao: ((sessao: Sessao) => void) | null = null;

  constructor(private readonly baseUrl: string) {}

  definirSessao(sessao: Sessao | null): void {
    this.sessao = sessao;
  }

  aoRenovarSessao(ouvinte: (sessao: Sessao) => void): void {
    this.ouvinteDeRenovacao = ouvinte;
  }

  /** Pede um token novo com o refresh token. Várias chamadas ao mesmo tempo dividem a mesma renovação. */
  private renovarSessao(): Promise<boolean> {
    const refreshToken = this.sessao?.refreshToken;
    if (!refreshToken) {
      return Promise.resolve(false);
    }
    this.renovacao ??= (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
          return false;
        }
        const nova = parseSessao(await response.json());
        this.sessao = nova;
        this.ouvinteDeRenovacao?.(nova);
        return true;
      } catch {
        return false;
      } finally {
        this.renovacao = null;
      }
    })();
    return this.renovacao;
  }

  private async requisicao(
    caminho: string,
    metodo: Metodo,
    corpo?: object | FormData,
    tempoLimite = TEMPO_LIMITE_MS,
    jaRenovou = false,
  ): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), tempoLimite);
    const ehFormulario = corpo instanceof FormData;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (corpo && !ehFormulario) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.sessao) {
      headers.Authorization = `Bearer ${this.sessao.accessToken}`;
    }

    let response: Response;
    let body: unknown = null;
    try {
      response = await fetch(`${this.baseUrl}${caminho}`, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : ehFormulario ? corpo : JSON.stringify(corpo),
        signal: controller.signal,
      });
      const texto = await response.text();
      body = texto.length > 0 ? (JSON.parse(texto) as unknown) : null;
    } catch {
      // Sem resposta: sem internet, API desligada ou tempo esgotado.
      throw new ApiError(0, 'Não foi possível falar com o servidor do Me Conta.');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 && !jaRenovou && !caminho.startsWith('/api/v1/auth/') && (await this.renovarSessao())) {
      return this.requisicao(caminho, metodo, corpo, tempoLimite, true);
    }
    if (!response.ok) {
      throw new ApiError(response.status, mensagemAmigavel(response.status, body), body);
    }
    return { status: response.status, body };
  }

  private async get(caminho: string, tempoLimite = TEMPO_LIMITE_MS): Promise<unknown> {
    return (await this.requisicao(caminho, 'GET', undefined, tempoLimite)).body;
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
    try {
      await this.post('/api/v1/auth/register', { email, password: senha });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        throw new ApiError(400, mensagemDoCadastro(error.corpo));
      }
      throw error;
    }
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
    return parseFamiliaDetalhe(await this.post(`/api/v1/convites/${encodeURIComponent(codigo.trim().toUpperCase())}/aceitar`));
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
    await anexarArquivo(formulario, 'Audio', resposta.audio);
    if (resposta.foto) {
      await anexarArquivo(formulario, 'Foto', resposta.foto);
    }
    if (resposta.titulo) {
      formulario.append('Titulo', resposta.titulo);
    }
    if (resposta.transcricao) {
      formulario.append('Transcricao', resposta.transcricao);
    }
    formulario.append('DuracaoSegundos', String(Math.max(1, Math.round(resposta.duracaoSegundos))));
    formulario.append('ChaveIdempotencia', resposta.chaveIdempotencia);

    const { body } = await this.requisicao(`/api/v1/envios/${envioId}/pagina`, 'POST', formulario, TEMPO_LIMITE_LONGO_MS);
    return parsePagina(body);
  }

  async listarCaderno(familiaId: number, pagina: number, tamanho: number): Promise<ListaPaginada<Pagina>> {
    return parseListaDePaginas(await this.get(`/api/v1/familias/${familiaId}/caderno?pagina=${pagina}&tamanho=${tamanho}`));
  }

  async apagarPagina(paginaId: number): Promise<void> {
    await this.requisicao(`/api/v1/paginas/${paginaId}`, 'DELETE');
  }

  async definirTranscricao(paginaId: number, texto: string | null): Promise<Pagina> {
    return parsePagina((await this.requisicao(`/api/v1/paginas/${paginaId}/transcricao`, 'PUT', { texto })).body);
  }

  async baixarArquivo(caminho: string, nomeLocal: string): Promise<string> {
    if (Platform.OS === 'web') {
      // Na pré-visualização web não há pasta do app: o áudio é tocado direto da API.
      return `${this.baseUrl}${caminho}`;
    }
    const pasta = new Directory(Paths.document, 'midia');
    pasta.create({ intermediates: true, idempotent: true });
    const destino = new File(pasta, nomeLocal);
    if (destino.exists) {
      return destino.uri;
    }
    const baixar = (): Promise<File> =>
      File.downloadFileAsync(`${this.baseUrl}${caminho}`, destino, {
        headers: this.sessao ? { Authorization: `Bearer ${this.sessao.accessToken}` } : {},
        idempotent: true,
      });
    try {
      return (await baixar()).uri;
    } catch {
      // Token vencido no meio do download: renova e tenta mais uma vez.
      if (await this.renovarSessao()) {
        return (await baixar()).uri;
      }
      throw new ApiError(0, 'Não foi possível baixar o arquivo.');
    }
  }

  async obterIndicador(): Promise<IndicadorConversas> {
    return parseIndicador(await this.get('/api/v1/indicadores/conversas-de-verdade'));
  }

  // ---------- Mapa do bairro ----------

  async analisarPrivacidade(paginaId: number): Promise<AnalisePrivacidade> {
    return parseAnalise(await this.post(`/api/v1/paginas/${paginaId}/analise-privacidade`));
  }

  async explicarRisco(paginaId: number): Promise<ExplicacaoDeRisco> {
    return parseExplicacao(await this.get(`/api/v1/paginas/${paginaId}/explicacao-de-risco`, TEMPO_LIMITE_LONGO_MS));
  }

  async publicarNoBairro(paginaId: number, pedido: PublicarMemoriaRequest): Promise<Publicacao> {
    try {
      return parsePublicacao(await this.post(`/api/v1/paginas/${paginaId}/publicacao`, pedido));
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && isRecord(error.corpo) && error.corpo.analise) {
        throw new PublicacaoRecusadaError(error.message, parseAnalise(error.corpo.analise));
      }
      throw error;
    }
  }

  async tirarDoMapa(paginaId: number): Promise<void> {
    await this.requisicao(`/api/v1/paginas/${paginaId}/publicacao`, 'DELETE');
  }

  async listarMemoriasDoBairro(bairro: string): Promise<MemoriaDoBairro[]> {
    return parsers.lista(await this.get(`/api/v1/bairros/${encodeURIComponent(bairro.trim())}/memorias`), parseMemoria);
  }

  async enderecoDoAudioPublico(caminho: string): Promise<string> {
    // Rota aberta (sem login): o player toca direto do servidor.
    return `${this.baseUrl}${caminho}`;
  }

  // ---------- Porta-retrato ----------

  async listarAvisos(familiaId: number, somenteNaoVistos: boolean): Promise<Aviso[]> {
    return parsers.lista(
      await this.get(`/api/v1/familias/${familiaId}/avisos?somenteNaoVistos=${somenteNaoVistos}`),
      parseAviso,
    );
  }

  async marcarAvisoVisto(avisoId: number): Promise<Aviso> {
    return parseAviso(await this.post(`/api/v1/avisos/${avisoId}/visto`));
  }

  async obterPortaRetrato(idosoId: number): Promise<PortaRetrato | null> {
    try {
      return parsePortaRetrato(await this.get(`/api/v1/idosos/${idosoId}/porta-retrato`));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

/** O cadastro do Identity devolve códigos em inglês (PasswordTooShort...): traduz os mais comuns. */
function mensagemDoCadastro(corpo: unknown): string {
  const erros = isRecord(corpo) && isRecord(corpo.errors) ? Object.keys(corpo.errors) : [];
  if (erros.some((codigo) => codigo.startsWith('Duplicate'))) {
    return 'Esse e-mail já tem conta. Entre com ele.';
  }
  if (erros.some((codigo) => codigo.startsWith('Password'))) {
    return 'A senha precisa de 6 caracteres, com letra maiúscula, minúscula, número e símbolo.';
  }
  if (erros.some((codigo) => codigo.includes('Email'))) {
    return 'Confira o e-mail.';
  }
  return 'Não foi possível criar a conta. Confira os dados.';
}
