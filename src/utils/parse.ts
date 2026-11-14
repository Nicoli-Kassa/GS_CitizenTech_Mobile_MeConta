/**
 * Leitura segura de dados crus.
 *
 * Respostas da API e linhas do SQLite entram como `unknown` e só viram
 * tipos do app depois de conferidas aqui.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

export function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  // O SQLite guarda booleanos como 0 e 1.
  if (value === 0 || value === 1) {
    return value === 1;
  }
  return null;
}

/** Lê um campo obrigatório; se faltar, a resposta é considerada inválida. */
export function requireString(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);
  if (value === null) {
    throw new TypeError(`Campo "${key}" ausente ou inválido.`);
  }
  return value;
}

export function requireNumber(record: Record<string, unknown>, key: string): number {
  const value = readNumber(record, key);
  if (value === null) {
    throw new TypeError(`Campo "${key}" ausente ou inválido.`);
  }
  return value;
}

/** Lê o campo `detail` do ProblemDetails (RFC 9457) que a API devolve nos erros. */
export function readProblemDetail(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }
  const detail = readString(body, 'detail');
  if (detail && detail.trim().length > 0) {
    return detail.trim();
  }
  // Erros de validação do ASP.NET: { errors: { Campo: ["mensagem"] } }
  const errors = body.errors;
  if (isRecord(errors)) {
    for (const lista of Object.values(errors)) {
      if (Array.isArray(lista) && typeof lista[0] === 'string') {
        return lista[0];
      }
    }
  }
  return readString(body, 'title');
}
