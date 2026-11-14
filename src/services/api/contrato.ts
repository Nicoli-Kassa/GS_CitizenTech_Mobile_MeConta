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
  Pergunta,
  PerguntaDaSemana,
  Sessao,
  StatusEnvio,
} from '../../types/api';

/**
 * Tudo o que o app pede ao servidor, com os mesmos nomes da API.
 *
 * Duas implementações seguem este contrato:
 * - `ApiHttp`: a API em C# de verdade;
 * - `ApiMock`: dados de demonstração no próprio celular, com as mesmas
 *   regras e mensagens de erro da API.
 *
 * As telas nunca falam com uma implementação direto: passam pelo banco
 * local e pela sincronização (`services/sincronizacao.ts`).
 */
export interface ApiMeConta {
  readonly nome: 'api' | 'demonstracao';

  /** Token usado nas próximas chamadas (ou `null` depois de sair). */
  definirToken(token: string | null): void;

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
  /**
   * Baixa o áudio ou a foto de uma página e devolve o endereço do arquivo no
   * celular, para o caderno funcionar sem internet (US10).
   */
  baixarArquivo(caminho: string, nomeLocal: string): Promise<string>;

  obterIndicador(): Promise<IndicadorConversas>;
}
