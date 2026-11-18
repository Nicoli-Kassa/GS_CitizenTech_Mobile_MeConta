import type {
  Achado,
  AlertaDeRisco,
  AnalisePrivacidade,
  Aviso,
  Categoria,
  Convite,
  Envio,
  ExplicacaoDeRisco,
  FamiliaDetalhe,
  FamiliaResumo,
  Idoso,
  IndicadorConversas,
  ListaPaginada,
  Membro,
  MembroDaFamilia,
  MemoriaDoBairro,
  NivelDeRisco,
  Pagina,
  PapelNaFamilia,
  Pergunta,
  PerguntaDaSemana,
  PortaRetrato,
  Publicacao,
  ResultadoDaAnalise,
  Sessao,
  StatusEnvio,
  TipoPergunta,
} from '../../types/api';
import {
  isRecord,
  readBoolean,
  readNumber,
  readString,
  requireNumber,
  requireString,
} from '../../utils/parse';

/**
 * Conversão das respostas da API (JSON sem tipo) para os tipos do app.
 * Se faltar um campo obrigatório, a resposta inteira é recusada.
 */

function registro(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError('Resposta da API em formato inesperado.');
  }
  return value;
}

function lista<T>(value: unknown, converter: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new TypeError('A API deveria devolver uma lista.');
  }
  return value.map(converter);
}

function papel(value: string): PapelNaFamilia {
  return value === 'Criador' ? 'Criador' : 'Membro';
}

function status(value: string): StatusEnvio {
  return value === 'Respondida' ? 'Respondida' : 'Enviada';
}

function tipo(value: string): TipoPergunta {
  return value === 'DaFamilia' ? 'DaFamilia' : 'Catalogo';
}

export function parseSessao(value: unknown): Sessao {
  const r = registro(value);
  return {
    tokenType: readString(r, 'tokenType') ?? 'Bearer',
    accessToken: requireString(r, 'accessToken'),
    expiresIn: readNumber(r, 'expiresIn') ?? 3600,
    refreshToken: readString(r, 'refreshToken') ?? '',
  };
}

export function parseMembro(value: unknown): Membro {
  const r = registro(value);
  return { id: requireNumber(r, 'id'), nome: requireString(r, 'nome'), criadoEm: requireString(r, 'criadoEm') };
}

export function parseFamiliaResumo(value: unknown): FamiliaResumo {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    nome: requireString(r, 'nome'),
    meuPapel: papel(requireString(r, 'meuPapel')),
    quantidadeDeIdosos: readNumber(r, 'quantidadeDeIdosos') ?? 0,
    criadaEm: requireString(r, 'criadaEm'),
  };
}

export function parseIdoso(value: unknown): Idoso {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    familiaId: requireNumber(r, 'familiaId'),
    nome: requireString(r, 'nome'),
    apelido: requireString(r, 'apelido'),
    whatsApp: readString(r, 'whatsApp'),
    respondeSozinho: readBoolean(r, 'respondeSozinho') ?? false,
    cadastradoEm: requireString(r, 'cadastradoEm'),
  };
}

function parseMembroDaFamilia(value: unknown): MembroDaFamilia {
  const r = registro(value);
  return {
    membroId: requireNumber(r, 'membroId'),
    nome: requireString(r, 'nome'),
    papel: papel(requireString(r, 'papel')),
    entrouEm: requireString(r, 'entrouEm'),
  };
}

export function parseFamiliaDetalhe(value: unknown): FamiliaDetalhe {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    nome: requireString(r, 'nome'),
    criadaEm: requireString(r, 'criadaEm'),
    membros: lista(r.membros ?? [], parseMembroDaFamilia),
    idosos: lista(r.idosos ?? [], parseIdoso),
  };
}

export function parseConvite(value: unknown): Convite {
  const r = registro(value);
  return { codigo: requireString(r, 'codigo'), expiraEm: requireString(r, 'expiraEm') };
}

export function parseCategoria(value: unknown): Categoria {
  const r = registro(value);
  return { id: requireNumber(r, 'id'), slug: requireString(r, 'slug'), nome: requireString(r, 'nome') };
}

export function parsePergunta(value: unknown): Pergunta {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    texto: requireString(r, 'texto'),
    categoriaId: requireNumber(r, 'categoriaId'),
    tipo: tipo(requireString(r, 'tipo')),
    jaPerguntada: readBoolean(r, 'jaPerguntada') ?? false,
  };
}

export function parsePerguntaDaSemana(value: unknown): PerguntaDaSemana {
  const r = registro(value);
  return {
    idosoId: requireNumber(r, 'idosoId'),
    semanaInicio: requireString(r, 'semanaInicio'),
    semanaFim: requireString(r, 'semanaFim'),
    pergunta: parsePergunta(r.pergunta),
  };
}

export function parseEnvio(value: unknown): Envio {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    idosoId: requireNumber(r, 'idosoId'),
    perguntaId: requireNumber(r, 'perguntaId'),
    pergunta: requireString(r, 'pergunta'),
    mensagem: requireString(r, 'mensagem'),
    linkWhatsApp: requireString(r, 'linkWhatsApp'),
    status: status(requireString(r, 'status')),
    enviadoEm: requireString(r, 'enviadoEm'),
    respondidoEm: readString(r, 'respondidoEm'),
    paginaId: readNumber(r, 'paginaId'),
  };
}

export function parsePagina(value: unknown): Pagina {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    envioId: requireNumber(r, 'envioId'),
    idosoId: requireNumber(r, 'idosoId'),
    idosoApelido: readString(r, 'idosoApelido') ?? '',
    titulo: requireString(r, 'titulo'),
    pergunta: requireString(r, 'pergunta'),
    categoriaId: requireNumber(r, 'categoriaId'),
    duracaoSegundos: readNumber(r, 'duracaoSegundos') ?? 0,
    temFoto: readBoolean(r, 'temFoto') ?? false,
    audioUrl: requireString(r, 'audioUrl'),
    fotoUrl: readString(r, 'fotoUrl'),
    criadaPorMembroId: requireNumber(r, 'criadaPorMembroId'),
    chaveIdempotencia: requireString(r, 'chaveIdempotencia'),
    transcricao: readString(r, 'transcricao'),
    criadaEm: requireString(r, 'criadaEm'),
  };
}

export function parseListaDePaginas(value: unknown): ListaPaginada<Pagina> {
  const r = registro(value);
  return {
    itens: lista(r.itens, parsePagina),
    pagina: readNumber(r, 'pagina') ?? 1,
    tamanho: readNumber(r, 'tamanho') ?? 20,
    total: readNumber(r, 'total') ?? 0,
    totalDePaginas: readNumber(r, 'totalDePaginas') ?? 0,
  };
}

export function parseIndicador(value: unknown): IndicadorConversas {
  const r = registro(value);
  return {
    semanaInicio: requireString(r, 'semanaInicio'),
    semanaFim: requireString(r, 'semanaFim'),
    idososCadastrados: readNumber(r, 'idososCadastrados') ?? 0,
    idososQueResponderam: readNumber(r, 'idososQueResponderam') ?? 0,
    percentualConversasDeVerdade: readNumber(r, 'percentualConversasDeVerdade'),
    minutosDeAudio: readNumber(r, 'minutosDeAudio') ?? 0,
    idososQueRespondemSozinhos: readNumber(r, 'idososQueRespondemSozinhos') ?? 0,
    mensagem: readString(r, 'mensagem'),
  };
}

function nivel(value: string | null): NivelDeRisco {
  return value === 'Alto' ? 'Alto' : value === 'Medio' ? 'Medio' : 'Baixo';
}

function resultado(value: string | null): ResultadoDaAnalise {
  switch (value) {
    case 'Bloqueada':
    case 'PrecisaConfirmar':
    case 'Publicada':
      return value;
    default:
      return 'Liberada';
  }
}

function textos(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function parseAviso(value: unknown): Aviso {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    idosoId: requireNumber(r, 'idosoId'),
    apelido: readString(r, 'apelido') ?? '',
    envioId: readNumber(r, 'envioId'),
    pergunta: readString(r, 'pergunta'),
    criadoEm: requireString(r, 'criadoEm'),
    visto: readBoolean(r, 'visto') ?? false,
    vistoEm: readString(r, 'vistoEm'),
  };
}

export function parsePortaRetrato(value: unknown): PortaRetrato {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    idosoId: requireNumber(r, 'idosoId'),
    codigo: readString(r, 'codigo') ?? '',
    conectado: readBoolean(r, 'conectado') ?? false,
    ultimoContatoEm: readString(r, 'ultimoContatoEm'),
  };
}

function parseAchado(value: unknown): Achado {
  const r = registro(value);
  return {
    regraId: readString(r, 'regraId') ?? '',
    tipo: readString(r, 'tipo') ?? '',
    rotulo: readString(r, 'rotulo') ?? 'Dado pessoal',
    nivel: nivel(readString(r, 'nivel')),
    campo: readString(r, 'campo'),
    trechoMascarado: readString(r, 'trechoMascarado') ?? '',
    explicacao: readString(r, 'explicacao') ?? '',
  };
}

export function parseAnalise(value: unknown): AnalisePrivacidade {
  const r = registro(value);
  const versao = isRecord(r.versaoSegura) ? r.versaoSegura : {};
  return {
    paginaId: requireNumber(r, 'paginaId'),
    resultado: resultado(readString(r, 'resultado')),
    indiceRiscoCidadao: readNumber(r, 'indiceRiscoCidadao') ?? 0,
    faixa: nivel(readString(r, 'faixa')),
    bloqueada: readBoolean(r, 'bloqueada') ?? false,
    exigeConfirmacao: readBoolean(r, 'exigeConfirmacao') ?? false,
    achados: lista(r.achados ?? [], parseAchado),
    versaoSegura: { titulo: readString(versao, 'titulo') ?? '', transcricao: readString(versao, 'transcricao') },
  };
}

function parseAlerta(value: unknown): AlertaDeRisco {
  const r = registro(value);
  return {
    rotulo: readString(r, 'rotulo') ?? 'Dado pessoal',
    nivel: nivel(readString(r, 'nivel')),
    trechos: textos(r.trechos),
    alerta: readString(r, 'alerta') ?? '',
    riscoReal: readString(r, 'riscoReal') ?? '',
    oQueFazer: readString(r, 'oQueFazer') ?? '',
  };
}

export function parseExplicacao(value: unknown): ExplicacaoDeRisco {
  const r = registro(value);
  return {
    paginaId: requireNumber(r, 'paginaId'),
    resultado: resultado(readString(r, 'resultado')),
    indiceRiscoCidadao: readNumber(r, 'indiceRiscoCidadao') ?? 0,
    faixa: nivel(readString(r, 'faixa')),
    resumo: readString(r, 'resumo') ?? '',
    alertas: lista(r.alertas ?? [], parseAlerta),
    versaoSugerida: readString(r, 'versaoSugerida'),
    fonte: readString(r, 'fonte') ?? 'Local',
  };
}

export function parseMemoria(value: unknown): MemoriaDoBairro {
  const r = registro(value);
  return {
    id: requireNumber(r, 'id'),
    bairro: requireString(r, 'bairro'),
    titulo: requireString(r, 'titulo'),
    apelido: readString(r, 'apelido') ?? '',
    transcricao: readString(r, 'transcricao'),
    categoriaId: readNumber(r, 'categoriaId') ?? 0,
    audioUrl: requireString(r, 'audioUrl'),
    publicadaEm: requireString(r, 'publicadaEm'),
  };
}

export function parsePublicacao(value: unknown): Publicacao {
  const r = registro(value);
  return { memoria: parseMemoria(r.memoria), analise: parseAnalise(r.analise) };
}

export const parsers = { lista };
