import { Asset } from 'expo-asset';

import type {
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
  PapelNaFamilia,
  Pergunta,
  PerguntaDaSemana,
  Sessao,
  StatusEnvio,
} from '../../types/api';
import { ApiError } from '../../utils/errors';
import {
  EXTENSOES_AUDIO,
  hojeEmSaoPaulo,
  MENSAGENS,
  montarLinkWhatsApp,
  montarMensagem,
  normalizarTelefone,
  semanaContendo,
  sugerirPergunta,
  validarNomeDaFamilia,
  validarPerguntaPropria,
} from '../../utils/regras';
import { gravarPreferencia, lerPreferencia } from '../banco/banco';
import { CATEGORIAS, PERGUNTAS_DO_CATALOGO } from './catalogo';
import type { ApiMeConta } from './contrato';

/**
 * Servidor de demonstração que roda no próprio celular.
 *
 * Segue o mesmo contrato, as mesmas regras e as mesmas mensagens de erro da
 * API em C#, então o app funciona igual nos dois modos. O estado fica salvo
 * no SQLite (preferência `mock-servidor`) e sobrevive ao fechar o app.
 *
 * Todos os dados são fictícios: a Família Souza, a Bia, a Cláudia, a
 * Vó Lourdes e o Vô Antônio, os mesmos da demonstração da API.
 */

type Participacao = { membroId: number; papel: PapelNaFamilia; entrouEm: string };
type FamiliaMock = { id: number; nome: string; criadaEm: string; participacoes: Participacao[] };
type UsuarioMock = { email: string; senha: string; membroId: number | null };
type PerguntaDaFamiliaMock = Pergunta & { familiaId: number };
type EnvioMock = Envio & { categoriaId: number };
type ConviteMock = Convite & { familiaId: number };

type EstadoMock = {
  versao: 1;
  proximoId: number;
  usuarios: UsuarioMock[];
  membros: Membro[];
  familias: FamiliaMock[];
  convites: ConviteMock[];
  idosos: Idoso[];
  perguntasDaFamilia: PerguntaDaFamiliaMock[];
  envios: EnvioMock[];
  paginas: Pagina[];
};

const CHAVE_ESTADO = 'mock-servidor';
const SENHA_DEMONSTRACAO = 'MeConta@2026';
/** Áudio de exemplo das páginas de demonstração (melodia gerada para o projeto). */
const AUDIO_DEMO = 'demo:audio';
const DURACAO_AUDIO_DEMO = 20;

/** Simula a ida e a volta pela rede, para o carregamento aparecer como no real. */
function esperar(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function diasAtras(dias: number, hora = 15): string {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() - dias);
  data.setUTCHours(hora, 0, 0, 0);
  return data.toISOString();
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

function catalogo(id: number): Pergunta {
  const pergunta = PERGUNTAS_DO_CATALOGO.find((item) => item.id === id);
  if (!pergunta) {
    throw new Error(`Pergunta ${id} não existe no catálogo.`);
  }
  return pergunta;
}

function estadoInicial(): EstadoMock {
  const lourdes: Idoso = {
    id: 1,
    familiaId: 1,
    nome: 'Lourdes Souza',
    apelido: 'Vó Lourdes',
    // Número fictício, igual ao da demonstração da API.
    whatsApp: '5511900000001',
    respondeSozinho: true,
    cadastradoEm: diasAtras(40),
  };
  const antonio: Idoso = {
    id: 2,
    familiaId: 1,
    nome: 'Antônio Souza',
    apelido: 'Vô Antônio',
    whatsApp: null,
    respondeSozinho: false,
    cadastradoEm: diasAtras(40),
  };

  const memorias: { perguntaId: number; titulo: string; dias: number }[] = [
    { perguntaId: 6, titulo: 'O baile em que conheci seu avô', dias: 30 },
    { perguntaId: 12, titulo: 'O ateliê de costura da sala', dias: 16 },
    { perguntaId: 16, titulo: 'Quando a rua ainda era de terra', dias: 9 },
    { perguntaId: 1, titulo: 'O bolo de fubá de domingo', dias: 2 },
  ];

  const envios: EnvioMock[] = [];
  const paginas: Pagina[] = [];
  memorias.forEach((memoria, indice) => {
    const pergunta = catalogo(memoria.perguntaId);
    const envioId = indice + 1;
    const mensagem = montarMensagem(lourdes.apelido, pergunta.texto);
    envios.push({
      id: envioId,
      idosoId: lourdes.id,
      perguntaId: pergunta.id,
      pergunta: pergunta.texto,
      categoriaId: pergunta.categoriaId,
      mensagem,
      linkWhatsApp: montarLinkWhatsApp(lourdes.whatsApp ?? '', mensagem),
      status: 'Respondida',
      enviadoEm: diasAtras(memoria.dias + 1, 12),
      respondidoEm: diasAtras(memoria.dias),
      paginaId: indice + 1,
    });
    paginas.push({
      id: indice + 1,
      envioId,
      idosoId: lourdes.id,
      idosoApelido: lourdes.apelido,
      titulo: memoria.titulo,
      pergunta: pergunta.texto,
      categoriaId: pergunta.categoriaId,
      duracaoSegundos: DURACAO_AUDIO_DEMO,
      temFoto: false,
      audioUrl: AUDIO_DEMO,
      fotoUrl: null,
      criadaPorMembroId: 1,
      chaveIdempotencia: uuid(),
      criadaEm: diasAtras(memoria.dias),
    });
  });

  // Uma pergunta enviada ontem, ainda esperando a resposta.
  const aguardando = catalogo(22);
  const mensagem = montarMensagem(lourdes.apelido, aguardando.texto);
  envios.push({
    id: 5,
    idosoId: lourdes.id,
    perguntaId: aguardando.id,
    pergunta: aguardando.texto,
    categoriaId: aguardando.categoriaId,
    mensagem,
    linkWhatsApp: montarLinkWhatsApp(lourdes.whatsApp ?? '', mensagem),
    status: 'Enviada',
    enviadoEm: diasAtras(1, 13),
    respondidoEm: null,
    paginaId: null,
  });

  return {
    versao: 1,
    proximoId: 100,
    usuarios: [
      { email: 'bia@example.com', senha: SENHA_DEMONSTRACAO, membroId: 1 },
      { email: 'claudia@example.com', senha: SENHA_DEMONSTRACAO, membroId: 2 },
    ],
    membros: [
      { id: 1, nome: 'Bia', criadoEm: diasAtras(40) },
      { id: 2, nome: 'Cláudia', criadoEm: diasAtras(40) },
    ],
    familias: [
      {
        id: 1,
        nome: 'Família Souza',
        criadaEm: diasAtras(40),
        participacoes: [
          { membroId: 1, papel: 'Criador', entrouEm: diasAtras(40) },
          { membroId: 2, papel: 'Membro', entrouEm: diasAtras(39) },
        ],
      },
    ],
    convites: [{ codigo: 'CASA26', familiaId: 1, expiraEm: new Date(Date.now() + 48 * 3600 * 1000).toISOString() }],
    idosos: [lourdes, antonio],
    perguntasDaFamilia: [],
    envios,
    paginas,
  };
}

export class ApiMock implements ApiMeConta {
  readonly nome = 'demonstracao' as const;
  private token: string | null = null;
  private estado: EstadoMock | null = null;

  definirToken(token: string | null): void {
    this.token = token;
  }

  // ---------- estado ----------

  private async carregar(): Promise<EstadoMock> {
    if (this.estado) {
      return this.estado;
    }
    const salvo = await lerPreferencia(CHAVE_ESTADO);
    let estado: EstadoMock | null = null;
    if (salvo) {
      try {
        const lido = JSON.parse(salvo) as EstadoMock;
        estado = lido.versao === 1 ? lido : null;
      } catch {
        estado = null;
      }
    }
    this.estado = estado ?? estadoInicial();
    if (!salvo) {
      await this.salvar();
    }
    return this.estado;
  }

  private async salvar(): Promise<void> {
    if (this.estado) {
      await gravarPreferencia(CHAVE_ESTADO, JSON.stringify(this.estado));
    }
  }

  private novoId(estado: EstadoMock): number {
    estado.proximoId += 1;
    return estado.proximoId;
  }

  /** Membro dono do token. Sem token válido: 401, como na API. */
  private membroAtual(estado: EstadoMock): Membro {
    const id = this.token?.startsWith('mock-membro-') ? Number(this.token.slice('mock-membro-'.length)) : NaN;
    const membro = estado.membros.find((item) => item.id === id);
    if (!membro) {
      throw new ApiError(401, 'Sua sessão expirou. Entre de novo.');
    }
    return membro;
  }

  private familiaDoMembro(estado: EstadoMock, familiaId: number): FamiliaMock {
    const membro = this.membroAtual(estado);
    const familia = estado.familias.find((item) => item.id === familiaId);
    if (!familia) {
      throw new ApiError(404, 'Família não encontrada.');
    }
    if (!familia.participacoes.some((p) => p.membroId === membro.id)) {
      throw new ApiError(403, 'Você não faz parte desta família.');
    }
    return familia;
  }

  private idosoDoMembro(estado: EstadoMock, idosoId: number): Idoso {
    const idoso = estado.idosos.find((item) => item.id === idosoId);
    if (!idoso) {
      throw new ApiError(404, 'Idoso não encontrado.');
    }
    this.familiaDoMembro(estado, idoso.familiaId);
    return idoso;
  }

  private detalhe(estado: EstadoMock, familia: FamiliaMock): FamiliaDetalhe {
    return {
      id: familia.id,
      nome: familia.nome,
      criadaEm: familia.criadaEm,
      membros: familia.participacoes.map((p) => ({
        membroId: p.membroId,
        nome: estado.membros.find((m) => m.id === p.membroId)?.nome ?? '',
        papel: p.papel,
        entrouEm: p.entrouEm,
      })),
      idosos: estado.idosos
        .filter((idoso) => idoso.familiaId === familia.id)
        .sort((a, b) => a.apelido.localeCompare(b.apelido)),
    };
  }

  private perguntasVisiveis(estado: EstadoMock, familiaId: number): Pergunta[] {
    const daFamilia = estado.perguntasDaFamilia
      .filter((p) => p.familiaId === familiaId)
      .map(({ familiaId: _ignorado, ...pergunta }) => pergunta);
    return [...PERGUNTAS_DO_CATALOGO, ...daFamilia];
  }

  private validarIdoso(estado: EstadoMock, familiaId: number, dados: IdosoRequest, ignorarId?: number): Idoso {
    const nome = dados.nome.trim();
    const apelido = dados.apelido.trim();
    if (nome.length === 0) {
      throw new ApiError(400, MENSAGENS.nomeVazio);
    }
    if (apelido.length === 0) {
      throw new ApiError(400, MENSAGENS.apelidoVazio);
    }
    let whatsApp: string | null = null;
    if (dados.whatsApp && dados.whatsApp.trim().length > 0) {
      try {
        whatsApp = normalizarTelefone(dados.whatsApp);
      } catch {
        throw new ApiError(400, MENSAGENS.telefoneInvalido);
      }
      const repetido = estado.idosos.some(
        (idoso) => idoso.familiaId === familiaId && idoso.whatsApp === whatsApp && idoso.id !== ignorarId,
      );
      if (repetido) {
        throw new ApiError(409, MENSAGENS.telefoneRepetido);
      }
    }
    return {
      id: ignorarId ?? 0,
      familiaId,
      nome,
      apelido,
      whatsApp,
      respondeSozinho: false,
      cadastradoEm: new Date().toISOString(),
    };
  }

  // ---------- login ----------

  async entrar(email: string, senha: string): Promise<Sessao> {
    await esperar(400);
    const estado = await this.carregar();
    const usuario = estado.usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!usuario || usuario.senha !== senha) {
      throw new ApiError(401, 'E-mail ou senha incorretos.');
    }
    const token = usuario.membroId ? `mock-membro-${usuario.membroId}` : `mock-usuario-${usuario.email}`;
    return { tokenType: 'Bearer', accessToken: token, expiresIn: 3600, refreshToken: '' };
  }

  async cadastrar(email: string, senha: string): Promise<void> {
    await esperar();
    const estado = await this.carregar();
    const limpo = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(limpo)) {
      throw new ApiError(400, 'Confira o e-mail.');
    }
    if (senha.length < 6 || !/\d/.test(senha) || !/[A-Z]/.test(senha) || !/[^A-Za-z0-9]/.test(senha)) {
      throw new ApiError(400, 'A senha precisa de 6 caracteres, com letra maiúscula, número e símbolo.');
    }
    if (estado.usuarios.some((u) => u.email === limpo)) {
      throw new ApiError(400, 'Esse e-mail já tem conta. Entre com ele.');
    }
    estado.usuarios.push({ email: limpo, senha, membroId: null });
    await this.salvar();
  }

  async criarPerfil(nome: string): Promise<Membro> {
    await esperar();
    const estado = await this.carregar();
    const email = this.token?.startsWith('mock-usuario-') ? this.token.slice('mock-usuario-'.length) : null;
    const usuario = estado.usuarios.find((u) => u.email === email);
    if (!usuario) {
      throw new ApiError(401, 'Sua sessão expirou. Entre de novo.');
    }
    if (usuario.membroId) {
      throw new ApiError(409, 'O seu perfil já foi criado.');
    }
    const limpo = nome.trim();
    if (limpo.length === 0) {
      throw new ApiError(400, 'Diga como você quer ser chamada no app.');
    }
    const membro: Membro = { id: this.novoId(estado), nome: limpo, criadoEm: new Date().toISOString() };
    estado.membros.push(membro);
    usuario.membroId = membro.id;
    this.token = `mock-membro-${membro.id}`;
    await this.salvar();
    return membro;
  }

  /** No mock, o token muda depois de criar o perfil. */
  tokenAtual(): string | null {
    return this.token;
  }

  async obterPerfil(): Promise<Membro> {
    await esperar(150);
    const estado = await this.carregar();
    if (this.token?.startsWith('mock-usuario-')) {
      throw new ApiError(403, 'Crie o seu perfil para continuar.');
    }
    return this.membroAtual(estado);
  }

  // ---------- família ----------

  async listarFamilias(): Promise<FamiliaResumo[]> {
    await esperar();
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);
    return estado.familias
      .filter((f) => f.participacoes.some((p) => p.membroId === membro.id))
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        meuPapel: f.participacoes.find((p) => p.membroId === membro.id)?.papel ?? 'Membro',
        quantidadeDeIdosos: estado.idosos.filter((i) => i.familiaId === f.id).length,
        criadaEm: f.criadaEm,
      }));
  }

  async criarFamilia(nome: string): Promise<FamiliaResumo> {
    await esperar();
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);
    let limpo: string;
    try {
      limpo = validarNomeDaFamilia(nome);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : MENSAGENS.nomeFamiliaVazio);
    }
    const agora = new Date().toISOString();
    const familia: FamiliaMock = {
      id: this.novoId(estado),
      nome: limpo,
      criadaEm: agora,
      participacoes: [{ membroId: membro.id, papel: 'Criador', entrouEm: agora }],
    };
    estado.familias.push(familia);
    await this.salvar();
    return { id: familia.id, nome: familia.nome, meuPapel: 'Criador', quantidadeDeIdosos: 0, criadaEm: agora };
  }

  async obterFamilia(familiaId: number): Promise<FamiliaDetalhe> {
    await esperar();
    const estado = await this.carregar();
    return this.detalhe(estado, this.familiaDoMembro(estado, familiaId));
  }

  async gerarConvite(familiaId: number): Promise<Convite> {
    await esperar();
    const estado = await this.carregar();
    this.familiaDoMembro(estado, familiaId);
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codigo = Array.from({ length: 6 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
    const convite: ConviteMock = { codigo, familiaId, expiraEm: new Date(Date.now() + 48 * 3600 * 1000).toISOString() };
    estado.convites.push(convite);
    await this.salvar();
    return { codigo: convite.codigo, expiraEm: convite.expiraEm };
  }

  async aceitarConvite(codigo: string): Promise<FamiliaDetalhe> {
    await esperar();
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);
    const convite = estado.convites.find((c) => c.codigo === codigo.trim().toUpperCase());
    if (!convite || new Date(convite.expiraEm).getTime() < Date.now()) {
      throw new ApiError(400, MENSAGENS.conviteInvalido);
    }
    const familia = estado.familias.find((f) => f.id === convite.familiaId);
    if (!familia) {
      throw new ApiError(400, MENSAGENS.conviteInvalido);
    }
    if (!familia.participacoes.some((p) => p.membroId === membro.id)) {
      familia.participacoes.push({ membroId: membro.id, papel: 'Membro', entrouEm: new Date().toISOString() });
      await this.salvar();
    }
    return this.detalhe(estado, familia);
  }

  // ---------- idosos ----------

  async cadastrarIdoso(familiaId: number, dados: IdosoRequest): Promise<Idoso> {
    await esperar();
    const estado = await this.carregar();
    this.familiaDoMembro(estado, familiaId);
    const idoso = { ...this.validarIdoso(estado, familiaId, dados), id: this.novoId(estado) };
    estado.idosos.push(idoso);
    await this.salvar();
    return idoso;
  }

  async atualizarIdoso(idosoId: number, dados: IdosoRequest): Promise<Idoso> {
    await esperar();
    const estado = await this.carregar();
    const atual = this.idosoDoMembro(estado, idosoId);
    const novo = this.validarIdoso(estado, atual.familiaId, dados, idosoId);
    Object.assign(atual, { nome: novo.nome, apelido: novo.apelido, whatsApp: novo.whatsApp });
    await this.salvar();
    return atual;
  }

  async concluirRoteiro(idosoId: number): Promise<Idoso> {
    await esperar();
    const estado = await this.carregar();
    const idoso = this.idosoDoMembro(estado, idosoId);
    idoso.respondeSozinho = true;
    await this.salvar();
    return idoso;
  }

  // ---------- perguntas ----------

  async listarCategorias(): Promise<Categoria[]> {
    await esperar(100);
    return [...CATEGORIAS];
  }

  async listarPerguntas(idosoId: number, categoriaSlug?: string): Promise<Pergunta[]> {
    await esperar();
    const estado = await this.carregar();
    const idoso = this.idosoDoMembro(estado, idosoId);
    const categoria = CATEGORIAS.find((c) => c.slug === categoriaSlug);
    if (categoriaSlug && !categoria) {
      throw new ApiError(404, 'Categoria não encontrada.');
    }
    const enviadas = new Set(estado.envios.filter((e) => e.idosoId === idoso.id).map((e) => e.perguntaId));
    return this.perguntasVisiveis(estado, idoso.familiaId)
      .filter((p) => !categoria || p.categoriaId === categoria.id)
      .map((p) => ({ ...p, jaPerguntada: enviadas.has(p.id) }));
  }

  async criarPergunta(familiaId: number, texto: string, categoriaId: number): Promise<Pergunta> {
    await esperar();
    const estado = await this.carregar();
    this.familiaDoMembro(estado, familiaId);
    let limpo: string;
    try {
      limpo = validarPerguntaPropria(texto, CATEGORIAS.some((c) => c.id === categoriaId) ? categoriaId : null);
    } catch (error) {
      throw new ApiError(400, error instanceof Error ? error.message : MENSAGENS.perguntaCurta);
    }
    const pergunta: PerguntaDaFamiliaMock = {
      id: this.novoId(estado),
      texto: limpo,
      categoriaId,
      tipo: 'DaFamilia',
      jaPerguntada: false,
      familiaId,
    };
    estado.perguntasDaFamilia.push(pergunta);
    await this.salvar();
    const { familiaId: _ignorado, ...resposta } = pergunta;
    return resposta;
  }

  async obterPerguntaDaSemana(idosoId: number): Promise<PerguntaDaSemana | null> {
    await esperar(150);
    const estado = await this.carregar();
    const idoso = this.idosoDoMembro(estado, idosoId);
    const semana = semanaContendo(hojeEmSaoPaulo());
    const enviadas = new Set(estado.envios.filter((e) => e.idosoId === idoso.id).map((e) => e.perguntaId));
    const pergunta = sugerirPergunta(idoso.id, PERGUNTAS_DO_CATALOGO, enviadas, semana.numero);
    return pergunta
      ? { idosoId: idoso.id, semanaInicio: semana.inicio, semanaFim: semana.fim, pergunta: { ...pergunta } }
      : null;
  }

  // ---------- envios ----------

  async enviarPergunta(idosoId: number, perguntaId: number): Promise<Envio> {
    await esperar();
    const estado = await this.carregar();
    const idoso = this.idosoDoMembro(estado, idosoId);
    if (!idoso.whatsApp) {
      throw new ApiError(409, MENSAGENS.semWhatsApp);
    }
    const pergunta = this.perguntasVisiveis(estado, idoso.familiaId).find((p) => p.id === perguntaId);
    if (!pergunta) {
      throw new ApiError(400, 'Essa pergunta não está disponível para esta família');
    }
    const mensagem = montarMensagem(idoso.apelido, pergunta.texto);
    const envio: EnvioMock = {
      id: this.novoId(estado),
      idosoId: idoso.id,
      perguntaId: pergunta.id,
      pergunta: pergunta.texto,
      categoriaId: pergunta.categoriaId,
      mensagem,
      linkWhatsApp: montarLinkWhatsApp(idoso.whatsApp, mensagem),
      status: 'Enviada',
      enviadoEm: new Date().toISOString(),
      respondidoEm: null,
      paginaId: null,
    };
    estado.envios.push(envio);
    await this.salvar();
    const { categoriaId: _ignorado, ...resposta } = envio;
    return resposta;
  }

  async listarEnvios(idosoId: number, status?: StatusEnvio): Promise<Envio[]> {
    await esperar();
    const estado = await this.carregar();
    this.idosoDoMembro(estado, idosoId);
    return estado.envios
      .filter((e) => e.idosoId === idosoId && (!status || e.status === status))
      .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm))
      .map(({ categoriaId: _ignorado, ...envio }) => envio);
  }

  // ---------- caderno ----------

  async guardarResposta(envioId: number, resposta: NovaResposta): Promise<Pagina> {
    await esperar(600);
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);

    const repetida = estado.paginas.find((p) => p.chaveIdempotencia === resposta.chaveIdempotencia);
    if (repetida) {
      // Reenvio do modo offline: devolve a mesma página, sem duplicar (200 na API).
      return repetida;
    }

    const envio = estado.envios.find((e) => e.id === envioId);
    if (!envio) {
      throw new ApiError(404, 'Pergunta enviada não encontrada.');
    }
    const idoso = this.idosoDoMembro(estado, envio.idosoId);
    if (envio.status === 'Respondida') {
      throw new ApiError(409, MENSAGENS.jaRespondida);
    }
    const extensao = resposta.audio.nome.split('.').pop()?.toLowerCase() ?? '';
    if (!(EXTENSOES_AUDIO as readonly string[]).includes(extensao)) {
      throw new ApiError(400, MENSAGENS.arquivoNaoEhAudio);
    }

    const agora = new Date().toISOString();
    const pagina: Pagina = {
      id: this.novoId(estado),
      envioId: envio.id,
      idosoId: idoso.id,
      idosoApelido: idoso.apelido,
      titulo: resposta.titulo?.trim() ? resposta.titulo.trim() : envio.pergunta,
      pergunta: envio.pergunta,
      categoriaId: envio.categoriaId,
      duracaoSegundos: Math.max(1, Math.round(resposta.duracaoSegundos)),
      temFoto: resposta.foto !== null,
      // No modo de demonstração o "servidor" é o próprio celular: o arquivo já está aqui.
      audioUrl: resposta.audio.uri,
      fotoUrl: resposta.foto?.uri ?? null,
      criadaPorMembroId: membro.id,
      chaveIdempotencia: resposta.chaveIdempotencia,
      criadaEm: agora,
    };
    estado.paginas.push(pagina);
    envio.status = 'Respondida';
    envio.respondidoEm = agora;
    envio.paginaId = pagina.id;
    await this.salvar();
    return pagina;
  }

  async listarCaderno(familiaId: number, numeroDaPagina: number, tamanho: number): Promise<ListaPaginada<Pagina>> {
    await esperar();
    const estado = await this.carregar();
    this.familiaDoMembro(estado, familiaId);
    const idsDosIdosos = new Set(estado.idosos.filter((i) => i.familiaId === familiaId).map((i) => i.id));
    const todas = estado.paginas
      .filter((p) => idsDosIdosos.has(p.idosoId))
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
    const inicio = (numeroDaPagina - 1) * tamanho;
    return {
      itens: todas.slice(inicio, inicio + tamanho),
      pagina: numeroDaPagina,
      tamanho,
      total: todas.length,
      totalDePaginas: todas.length === 0 ? 0 : Math.ceil(todas.length / tamanho),
    };
  }

  async apagarPagina(paginaId: number): Promise<void> {
    await esperar();
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);
    const pagina = estado.paginas.find((p) => p.id === paginaId);
    if (!pagina) {
      throw new ApiError(404, 'Página não encontrada.');
    }
    this.idosoDoMembro(estado, pagina.idosoId);
    if (pagina.criadaPorMembroId !== membro.id) {
      throw new ApiError(403, 'Só quem guardou a página pode apagá-la.');
    }
    estado.paginas = estado.paginas.filter((p) => p.id !== paginaId);
    const envio = estado.envios.find((e) => e.id === pagina.envioId);
    if (envio) {
      // Na API a pergunta volta a ficar esperando resposta.
      envio.status = 'Enviada';
      envio.respondidoEm = null;
      envio.paginaId = null;
    }
    await this.salvar();
  }

  async baixarArquivo(caminho: string): Promise<string> {
    if (caminho === AUDIO_DEMO) {
      const asset = Asset.fromModule(require('../../../assets/demo/audio-demo.m4a') as number);
      await asset.downloadAsync();
      return asset.localUri ?? asset.uri;
    }
    return caminho;
  }

  async obterIndicador(): Promise<IndicadorConversas> {
    await esperar();
    const estado = await this.carregar();
    const membro = this.membroAtual(estado);
    const familias = new Set(
      estado.familias.filter((f) => f.participacoes.some((p) => p.membroId === membro.id)).map((f) => f.id),
    );
    const semana = semanaContendo(hojeEmSaoPaulo());
    const idosos = estado.idosos.filter((i) => familias.has(i.familiaId));
    const daSemana = estado.paginas.filter((p) => {
      const dia = hojeEmSaoPaulo(new Date(p.criadaEm));
      return idosos.some((i) => i.id === p.idosoId) && dia >= semana.inicio && dia <= semana.fim;
    });
    const responderam = new Set(daSemana.map((p) => p.idosoId)).size;
    return {
      semanaInicio: semana.inicio,
      semanaFim: semana.fim,
      idososCadastrados: idosos.length,
      idososQueResponderam: responderam,
      percentualConversasDeVerdade: idosos.length === 0 ? null : (responderam / idosos.length) * 100,
      minutosDeAudio: daSemana.reduce((soma, p) => soma + p.duracaoSegundos, 0) / 60,
      idososQueRespondemSozinhos: idosos.filter((i) => i.respondeSozinho).length,
      mensagem: idosos.length === 0 ? 'Ainda não há dados' : null,
    };
  }
}
