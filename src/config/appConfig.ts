import Constants from 'expo-constants';

import { isRecord } from '../utils/parse';

/**
 * Configurações públicas do app.
 *
 * A URL da API vem de `EXPO_PUBLIC_API_URL` (arquivo `.env`) ou de
 * `app.json → expo.extra.apiUrl`. Sem URL, o app usa os dados de
 * demonstração (mock), que seguem as mesmas regras da API.
 */

function readExtra(key: string): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  if (!isRecord(extra)) {
    return null;
  }
  const value = extra[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/** URL da API, sem barra final, ou `null` para usar o mock. */
export const API_URL: string | null =
  (envApiUrl && envApiUrl.length > 0 ? envApiUrl : readExtra('apiUrl'))?.replace(/\/+$/, '') ?? null;

export const USANDO_MOCK = API_URL === null;

/**
 * Conta de demonstração. No modo sem API, é a Nicoli da Família Souza.
 * Com a API, é a conta que a API cria no primeiro uso (`bia@example.com`).
 */
export const CONTA_DEMONSTRACAO = {
  email: USANDO_MOCK ? 'nicoli@example.com' : 'bia@example.com',
  senha: 'MeConta@2026',
  rotulo: USANDO_MOCK ? 'Entrar como Nicoli (demonstração)' : 'Entrar com a conta de demonstração',
} as const;
