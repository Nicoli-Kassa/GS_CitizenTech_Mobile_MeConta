/**
 * Tradução de erros para mensagens que a família entende.
 *
 * Nenhuma tela mostra código de erro ou detalhe interno: as telas chamam
 * `describeError` e exibem o texto devolvido aqui.
 */

/** Erro de regra de negócio com a mensagem já pronta para a tela. */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Erro devolvido pela API (ou pelo mock, que imita a API).
 * `status` 0 significa que não houve resposta: sem internet ou servidor fora do ar.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Corpo cru da resposta de erro (ProblemDetails), para quem precisar de mais campos. */
    readonly corpo: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão com a internet. O que você fizer fica guardado no celular.';

/** Falhas em que vale guardar no celular e tentar de novo depois. */
export function ehFalhaDeConexao(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }
  const texto = error instanceof Error ? error.message.toUpperCase() : '';
  return texto.includes('NETWORK') || texto.includes('FAILED TO FETCH') || texto.includes('ABORT');
}

/** Converte qualquer erro em uma mensagem legível em português. */
export function describeError(error: unknown, fallback = 'Algo deu errado. Tente de novo.'): string {
  if (error instanceof AppError || error instanceof ApiError) {
    return error.message;
  }
  if (ehFalhaDeConexao(error)) {
    return MENSAGEM_SEM_CONEXAO;
  }
  return fallback;
}
