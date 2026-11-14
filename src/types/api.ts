/**
 * Tipos iguais aos DTOs da API do Me Conta (`/api/v1`).
 *
 * Datas chegam como texto ISO 8601 (UTC). Os enums chegam como texto,
 * porque a API usa `JsonStringEnumConverter`.
 */

export type PapelNaFamilia = 'Criador' | 'Membro';
export type StatusEnvio = 'Enviada' | 'Respondida';
export type TipoPergunta = 'Catalogo' | 'DaFamilia';

export type Membro = {
  id: number;
  nome: string;
  criadoEm: string;
};

export type FamiliaResumo = {
  id: number;
  nome: string;
  meuPapel: PapelNaFamilia;
  quantidadeDeIdosos: number;
  criadaEm: string;
};

export type MembroDaFamilia = {
  membroId: number;
  nome: string;
  papel: PapelNaFamilia;
  entrouEm: string;
};

export type Idoso = {
  id: number;
  familiaId: number;
  nome: string;
  apelido: string;
  whatsApp: string | null;
  respondeSozinho: boolean;
  cadastradoEm: string;
};

export type FamiliaDetalhe = {
  id: number;
  nome: string;
  criadaEm: string;
  membros: MembroDaFamilia[];
  idosos: Idoso[];
};

export type Convite = {
  codigo: string;
  expiraEm: string;
};

export type Categoria = {
  id: number;
  slug: string;
  nome: string;
};

export type Pergunta = {
  id: number;
  texto: string;
  categoriaId: number;
  tipo: TipoPergunta;
  jaPerguntada: boolean;
};

export type PerguntaDaSemana = {
  idosoId: number;
  semanaInicio: string;
  semanaFim: string;
  pergunta: Pergunta;
};

export type Envio = {
  id: number;
  idosoId: number;
  perguntaId: number;
  pergunta: string;
  mensagem: string;
  linkWhatsApp: string;
  status: StatusEnvio;
  enviadoEm: string;
  respondidoEm: string | null;
  paginaId: number | null;
};

export type Pagina = {
  id: number;
  envioId: number;
  idosoId: number;
  idosoApelido: string;
  titulo: string;
  pergunta: string;
  categoriaId: number;
  duracaoSegundos: number;
  temFoto: boolean;
  /** Caminho relativo na API. Ex.: `/api/v1/paginas/3/audio`. */
  audioUrl: string;
  fotoUrl: string | null;
  criadaPorMembroId: number;
  chaveIdempotencia: string;
  criadaEm: string;
};

export type ListaPaginada<T> = {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
  totalDePaginas: number;
};

export type IndicadorConversas = {
  semanaInicio: string;
  semanaFim: string;
  idososCadastrados: number;
  idososQueResponderam: number;
  percentualConversasDeVerdade: number | null;
  minutosDeAudio: number;
  idososQueRespondemSozinhos: number;
  mensagem: string | null;
};

/** Token devolvido por `POST /api/v1/auth/login` (ASP.NET Identity). */
export type Sessao = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

/** Arquivo do celular enviado no formulário multipart. */
export type ArquivoLocal = {
  uri: string;
  nome: string;
  tipo: string;
};

export type NovaResposta = {
  titulo: string | null;
  duracaoSegundos: number;
  chaveIdempotencia: string;
  audio: ArquivoLocal;
  foto: ArquivoLocal | null;
};

export type IdosoRequest = {
  nome: string;
  apelido: string;
  whatsApp: string | null;
};
