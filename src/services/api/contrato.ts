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
  Pergunta,
  PerguntaDaSemana,
  PortaRetrato,
  Publicacao,
  PublicarMemoriaRequest,
  Sessao,
  StatusEnvio,
} from '../../types/api';
import { ApiError } from '../../utils/errors';

/**
 * Publicação recusada pelo filtro de dados pessoais (422).
 * Traz a análise com os dados encontrados (mascarados) e a versão segura do texto.
 */
export class PublicacaoRecusadaError extends ApiError {
  constructor(
    message: string,
    readonly analise: AnalisePrivacidade,
  ) {
    super(422, message);
    this.name = 'PublicacaoRecusadaError';
  }
}

/**
 * Tudo o que o app pede ao servidor, com os mesmos nomes da API.
 *
 * Duas implementações seguem este contrato:
 * - `ApiHttp`: a API em C# de verdade;
 * - `ApiMock`: dados de demonstração no próprio celular, com as mesmas
 *   regras e mensagens de erro da API.
 *
 * As telas leem do banco local; a gravação passa pela fila de sincronização
 * (`services/sincronizacao.ts`) sempre que precisa funcionar sem internet.
 */
export interface ApiMeConta {
  readonly nome: 'api' | 'demonstracao';

  /** Sessão usada nas próximas chamadas (ou `null` depois de sair). */
  definirSessao(sessao: Sessao | null): void;
  /** Avisa quando a sessão foi renovada sozinha (token vencido), para salvar a nova. */
  aoRenovarSessao(ouvinte: (sessao: Sessao) => void): void;

  entrar(email: string, senha: string): Promise<Sessao>;
  cadastrar(email: string, senha: string): Promise<void>;
  criarPerfil(nome: string): Promise<Membro>;
  obterPerfil(): Promise<Membro>;

  listarFamilias(): Promise<FamiliaResumo[]>;
  criarFamilia(nome: string): Promise<FamiliaResumo>;
  obterFamilia(familiaId: number): Promise<FamiliaDetalhe>;
  gerarConvite(familiaId: number): Promise<Convite>;
  aceitarConvite(codigo: string): Promise<FamiliaDetalhe>;

  cadastrarIdoso(familiaId: number, dados: IdosoRequest): Promise<Idoso>;
  atualizarIdoso(idosoId: number, dados: IdosoRequest): Promise<Idoso>;
  concluirRoteiro(idosoId: number): Promise<Idoso>;

  listarCategorias(): Promise<Categoria[]>;
  listarPerguntas(idosoId: number, categoriaSlug?: string): Promise<Pergunta[]>;
  criarPergunta(familiaId: number, texto: string, categoriaId: number): Promise<Pergunta>;
  /** `null` quando todas as perguntas do catálogo já foram enviadas (204). */
  obterPerguntaDaSemana(idosoId: number): Promise<PerguntaDaSemana | null>;

  enviarPergunta(idosoId: number, perguntaId: number): Promise<Envio>;
  listarEnvios(idosoId: number, status?: StatusEnvio): Promise<Envio[]>;

  guardarResposta(envioId: number, resposta: NovaResposta): Promise<Pagina>;
  listarCaderno(familiaId: number, pagina: number, tamanho: number): Promise<ListaPaginada<Pagina>>;
  apagarPagina(paginaId: number): Promise<void>;
  definirTranscricao(paginaId: number, texto: string | null): Promise<Pagina>;
  /**
   * Baixa o áudio ou a foto de uma página e devolve o endereço do arquivo no
   * celular, para o caderno funcionar sem internet (US10).
   */
  baixarArquivo(caminho: string, nomeLocal: string): Promise<string>;

  obterIndicador(): Promise<IndicadorConversas>;

  // Mapa do bairro (US16, US17) e filtro de dados pessoais (US18)
  analisarPrivacidade(paginaId: number): Promise<AnalisePrivacidade>;
  explicarRisco(paginaId: number): Promise<ExplicacaoDeRisco>;
  /** Lança `PublicacaoRecusadaError` quando o filtro barra ou pede confirmação. */
  publicarNoBairro(paginaId: number, pedido: PublicarMemoriaRequest): Promise<Publicacao>;
  tirarDoMapa(paginaId: number): Promise<void>;
  listarMemoriasDoBairro(bairro: string): Promise<MemoriaDoBairro[]>;
  /** Endereço para tocar o áudio público de uma memória do bairro. */
  enderecoDoAudioPublico(caminho: string): Promise<string>;

  // Porta-retrato (US15)
  listarAvisos(familiaId: number, somenteNaoVistos: boolean): Promise<Aviso[]>;
  marcarAvisoVisto(avisoId: number): Promise<Aviso>;
  /** `null` quando o idoso não tem porta-retrato pareado (404). */
  obterPortaRetrato(idosoId: number): Promise<PortaRetrato | null>;
}
