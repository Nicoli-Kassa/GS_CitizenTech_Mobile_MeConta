import type {
  Categoria,
  Convite,
  Envio,
  FamiliaDetalhe,
  FamiliaResumo,
  Idoso,
  IndicadorConversas,
  ListaPaginada,
  Membro,
  MembroDaFamilia,
  Pagina,
  PapelNaFamilia,
  Pergunta,
  PerguntaDaSemana,
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

export const parsers = { lista };
