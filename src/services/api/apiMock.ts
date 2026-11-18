import { Asset } from 'expo-asset';

import type {
  AnalisePrivacidade,
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
  PapelNaFamilia,
  Pergunta,
  PerguntaDaSemana,
  PortaRetrato,
  Publicacao,
  PublicarMemoriaRequest,
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
import { PublicacaoRecusadaError, type ApiMeConta } from './contrato';
import { analisarTexto, explicarAnalise } from './motorDeDemonstracao';

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
type MemoriaMock = MemoriaDoBairro & { paginaId: number | null; noMapa: boolean };
type AvisoMock = Aviso & { familiaId: number };

type EstadoMock = {
  versao: 2;
  proximoId: number;
  usuarios: UsuarioMock[];
  membros: Membro[];
  familias: FamiliaMock[];
  convites: ConviteMock[];
  idosos: Idoso[];
  perguntasDaFamilia: PerguntaDaFamiliaMock[];
  envios: EnvioMock[];
  paginas: Pagina[];
  memorias: MemoriaMock[];
  avisos: AvisoMock[];
  portaRetratos: PortaRetrato[];
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

  // As três últimas são iguais às páginas que a API cria para mostrar o filtro de dados pessoais.
  const memorias: { perguntaId: number; titulo: string; dias: number; transcricao: string | null }[] = [
    {
      perguntaId: 6,
      titulo: 'O baile em que conheci seu avô',
      dias: 30,
      transcricao: 'Foi no baile do clube, em 1974. Ele pisou no meu pé duas vezes e mesmo assim eu aceitei a terceira música.',
    },
    { perguntaId: 12, titulo: 'O ateliê de costura da sala', dias: 16, transcricao: null },
    {
      perguntaId: 11,
      titulo: 'A fábrica de tecidos',
      dias: 12,
      transcricao: 'Entrei na fábrica em 1962. Pediram meu CPF, 123.456.789-09, e a carteira de trabalho. Eu tinha dezesseis anos.',
    },
    {
      perguntaId: 16,
      titulo: 'Quando a rua ainda era de terra',
      dias: 9,
      transcricao:
        'Morei na Rua das Flores, 123 a vida inteira. Quando cheguei era tudo barro, e a gente ia buscar pão de bicicleta.',
    },
    {
      perguntaId: 5,
      titulo: 'Os chás da vó',
      dias: 5,
      transcricao: 'Hoje tomo remédio para pressão, mas o chá de erva-cidreira continua todo fim de tarde.',
    },
    {
      perguntaId: 1,
      titulo: 'O bolo de fubá de domingo',
      dias: 2,
      transcricao:
        'Três ovos caipiras, uma xícara de açúcar e manteiga da venda do seu Joaquim. A panela de pressão fica de fora: bolo é no forno.',
    },
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
      transcricao: memoria.transcricao,
      criadaEm: diasAtras(memoria.dias),
    });
  });
  const proximoEnvio = envios.length + 1;

  // Uma pergunta enviada ontem, ainda esperando a resposta.
  const aguardando = catalogo(22);
  const mensagem = montarMensagem(lourdes.apelido, aguardando.texto);
  envios.push({
    id: proximoEnvio,
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
    versao: 2,
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
    // Memórias de outras famílias (fictícias), já publicadas no caderno de Pirituba.
    memorias: [
      {
        id: 1,
        paginaId: null,
        noMapa: true,
        bairro: 'Pirituba',
        titulo: 'A padaria que virou farmácia',
        apelido: 'Dona Cida',
        transcricao: 'Na esquina tinha a padaria do seu Manuel. O pão saía às seis, e a fila dava volta no quarteirão.',
        categoriaId: 4,
        audioUrl: AUDIO_DEMO,
        publicadaEm: diasAtras(20),
      },
      {
        id: 2,
        paginaId: null,
        noMapa: true,
        bairro: 'Pirituba',
        titulo: 'O trem das seis e meia',
        apelido: 'Seu Zé',
        transcricao: 'Eu pegava o trem das seis e meia para a Lapa. Todo mundo se conhecia no vagão.',
        categoriaId: 4,
        audioUrl: AUDIO_DEMO,
        publicadaEm: diasAtras(11),
      },
    ],
    // A Vó Lourdes apertou "quero contar" no porta-retrato para a pergunta que está esperando.
    avisos: [
      {
        id: 1,
        familiaId: 1,
        idosoId: lourdes.id,
        apelido: lourdes.apelido,
        envioId: proximoEnvio,
        pergunta: aguardando.texto,
        criadoEm: diasAtras(0, Math.max(0, new Date().getUTCHours() - 1)),
        visto: false,
        vistoEm: null,
      },
    ],
    portaRetratos: [{ id: 1, idosoId: lourdes.id, codigo: 'PR-LOURDES', conectado: true, ultimoContatoEm: new Date().toISOString() }],
  };
}

export class ApiMock implements ApiMeConta {
  readonly nome = 'demonstracao' as const;
  private token: string | null = null;
  private estado: EstadoMock | null = null;

  definirSessao(sessao: Sessao | null): void {
    this.token = sessao?.accessToken ?? null;
  }

  aoRenovarSessao(): void {
    // No modo de demonstração a sessão não vence.
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
        estado = lido.versao === 2 ? lido : null;
      } catch {
        estado = null;
      }
    }
    this.estado = estado ?? estadoInicial();
    if (!estado) {
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

  /** Usuário dono do token (`mock-<email>`). */
  private usuarioAtual(estado: EstadoMock): UsuarioMock {
    const email = this.token?.startsWith('mock-') ? this.token.slice('mock-'.length) : '';
    const usuario = estado.usuarios.find((u) => u.email === email);
    if (!usuario) {
      throw new ApiError(401, 'Sua sessão expirou. Entre de novo.');
    }
    return usuario;
  }

  /** Membro dono do token. Sem perfil: 403, como na API. */
  private membroAtual(estado: EstadoMock): Membro {
    const usuario = this.usuarioAtual(estado);
    const membro = estado.membros.find((item) => item.id === usuario.membroId);
    if (!membro) {
      throw new ApiError(403, 'Crie o seu perfil para continuar.');
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
    return { tokenType: 'Bearer', accessToken: `mock-${usuario.email}`, expiresIn: 3600, refreshToken: '' };
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
    const usuario = this.usuarioAtual(estado);
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
    await this.salvar();
    return membro;
  }

  async obterPerfil(): Promise<Membro> {
    await esperar(150);
    const estado = await this.carregar();
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
      transcricao: resposta.transcricao?.trim() ? resposta.transcricao.trim() : null,
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
    estado.memorias.forEach((m) => {
      if (m.paginaId === paginaId) {
        m.noMapa = false;
      }
    });
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

  async definirTranscricao(paginaId: number, texto: string | null): Promise<Pagina> {
    await esperar();
    const estado = await this.carregar();
    const pagina = this.paginaDoMembro(estado, paginaId);
    const limpo = texto?.trim() ?? '';
    if (limpo.length > 4000) {
      throw new ApiError(400, 'Use até 4000 caracteres na transcrição');
    }
    pagina.transcricao = limpo.length > 0 ? limpo : null;
    await this.salvar();
    return pagina;
  }

  private paginaDoMembro(estado: EstadoMock, paginaId: number): Pagina {
    const pagina = estado.paginas.find((p) => p.id === paginaId);
    if (!pagina) {
      throw new ApiError(404, 'Página não encontrada.');
    }
    this.idosoDoMembro(estado, pagina.idosoId);
    return pagina;
  }

  // ---------- mapa do bairro ----------

  async analisarPrivacidade(paginaId: number): Promise<AnalisePrivacidade> {
    await esperar(400);
    const estado = await this.carregar();
    const pagina = this.paginaDoMembro(estado, paginaId);
    return analisarTexto(pagina.id, pagina.titulo, pagina.transcricao);
  }

  async explicarRisco(paginaId: number): Promise<ExplicacaoDeRisco> {
    await esperar(900);
    return explicarAnalise(await this.analisarPrivacidade(paginaId));
  }

  async publicarNoBairro(paginaId: number, pedido: PublicarMemoriaRequest): Promise<Publicacao> {
    await esperar(500);
    const estado = await this.carregar();
    const pagina = this.paginaDoMembro(estado, paginaId);
    if (!pedido.idosoAutorizou) {
      throw new ApiError(400, `Marque que ${pagina.idosoApelido} autorizou a publicação no mapa do bairro`);
    }
    const bairro = pedido.bairro.trim();
    if (bairro.length === 0) {
      throw new ApiError(400, 'Escolha o bairro da memória');
    }
    if (/\d/.test(bairro) || /\b(rua|avenida|av\.)\b/i.test(bairro)) {
      throw new ApiError(400, 'Use só o nome do bairro, sem rua, número ou outro dado pessoal');
    }
    if (estado.memorias.some((m) => m.paginaId === paginaId && m.noMapa)) {
      throw new ApiError(409, 'Esta memória já está no mapa do bairro');
    }
    const analise = analisarTexto(pagina.id, pagina.titulo, pagina.transcricao);
    if (analise.bloqueada || (analise.exigeConfirmacao && !pedido.confirmoDadosPessoais)) {
      throw new PublicacaoRecusadaError('Publicação recusada pelo filtro de dados pessoais', {
        ...analise,
        resultado: analise.bloqueada ? 'Bloqueada' : 'PrecisaConfirmar',
      });
    }
    const memoria: MemoriaMock = {
      id: this.novoId(estado),
      paginaId,
      noMapa: true,
      bairro,
      titulo: pagina.titulo,
      apelido: pagina.idosoApelido,
      transcricao: pagina.transcricao,
      categoriaId: pagina.categoriaId,
      audioUrl: pagina.audioUrl,
      publicadaEm: new Date().toISOString(),
    };
    estado.memorias.push(memoria);
    await this.salvar();
    const { paginaId: _p, noMapa: _n, ...publica } = memoria;
    return { memoria: publica, analise: { ...analise, resultado: 'Publicada' } };
  }

  async tirarDoMapa(paginaId: number): Promise<void> {
    await esperar();
    const estado = await this.carregar();
    this.paginaDoMembro(estado, paginaId);
    const memoria = estado.memorias.find((m) => m.paginaId === paginaId && m.noMapa);
    if (!memoria) {
      throw new ApiError(404, 'Esta memória não está no mapa do bairro.');
    }
    memoria.noMapa = false;
    await this.salvar();
  }

  async listarMemoriasDoBairro(bairro: string): Promise<MemoriaDoBairro[]> {
    await esperar();
    const estado = await this.carregar();
    const procurado = bairro.trim().toLowerCase();
    return estado.memorias
      .filter((m) => m.noMapa && m.bairro.toLowerCase() === procurado)
      .sort((a, b) => b.publicadaEm.localeCompare(a.publicadaEm))
      .map(({ paginaId: _p, noMapa: _n, ...publica }) => publica);
  }

  async enderecoDoAudioPublico(caminho: string): Promise<string> {
    return this.baixarArquivo(caminho);
  }

  // ---------- porta-retrato ----------

  async listarAvisos(familiaId: number, somenteNaoVistos: boolean): Promise<Aviso[]> {
    await esperar(150);
    const estado = await this.carregar();
    this.familiaDoMembro(estado, familiaId);
    return estado.avisos
      .filter((a) => a.familiaId === familiaId && (!somenteNaoVistos || !a.visto))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map(({ familiaId: _f, ...aviso }) => aviso);
  }

  async marcarAvisoVisto(avisoId: number): Promise<Aviso> {
    await esperar();
    const estado = await this.carregar();
    const aviso = estado.avisos.find((a) => a.id === avisoId);
    if (!aviso) {
      throw new ApiError(404, 'Aviso não encontrado.');
    }
    this.familiaDoMembro(estado, aviso.familiaId);
    aviso.visto = true;
    aviso.vistoEm = new Date().toISOString();
    await this.salvar();
    const { familiaId: _f, ...publico } = aviso;
    return publico;
  }

  async obterPortaRetrato(idosoId: number): Promise<PortaRetrato | null> {
    await esperar(150);
    const estado = await this.carregar();
    this.idosoDoMembro(estado, idosoId);
    const portaRetrato = estado.portaRetratos.find((p) => p.idosoId === idosoId);
    return portaRetrato ? { ...portaRetrato, ultimoContatoEm: new Date().toISOString() } : null;
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
