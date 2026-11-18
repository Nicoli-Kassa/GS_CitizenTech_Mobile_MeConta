import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Sessao } from '../types/api';
import { isRecord, readNumber, readString } from '../utils/parse';
import { gravarPreferencia, lerPreferencia } from './banco/banco';

/**
 * Guarda a sessão (token de acesso e refresh token).
 *
 * No celular ela vai para o armazenamento seguro do sistema (Keychain no
 * iOS, Keystore no Android). Na versão web, usada só para pré-visualizar,
 * fica no banco local.
 */

const CHAVE = 'me-conta-sessao';

async function ler(): Promise<string | null> {
  return Platform.OS === 'web' ? lerPreferencia(CHAVE) : SecureStore.getItemAsync(CHAVE);
}

export async function lerSessao(): Promise<Sessao | null> {
  const texto = await ler();
  if (!texto) {
    return null;
  }
  try {
    const dados: unknown = JSON.parse(texto);
    if (!isRecord(dados)) {
      return null;
    }
    const accessToken = readString(dados, 'accessToken');
    return accessToken
      ? {
          tokenType: readString(dados, 'tokenType') ?? 'Bearer',
          accessToken,
          expiresIn: readNumber(dados, 'expiresIn') ?? 3600,
          refreshToken: readString(dados, 'refreshToken') ?? '',
        }
      : null;
  } catch {
    return null;
  }
}

export async function gravarSessao(sessao: Sessao | null): Promise<void> {
  const texto = sessao ? JSON.stringify(sessao) : null;
  if (Platform.OS === 'web') {
    await gravarPreferencia(CHAVE, texto);
    return;
  }
  if (texto === null) {
    await SecureStore.deleteItemAsync(CHAVE);
  } else {
    await SecureStore.setItemAsync(CHAVE, texto);
  }
}
