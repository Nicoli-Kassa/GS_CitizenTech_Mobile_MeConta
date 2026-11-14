import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { gravarPreferencia, lerPreferencia } from './banco/banco';

/**
 * Guarda o token de acesso.
 *
 * No celular ele vai para o armazenamento seguro do sistema (Keychain no
 * iOS, Keystore no Android). Na versão web, usada só para pré-visualizar,
 * fica no banco local.
 */

const CHAVE = 'me-conta-token';

export async function lerToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return lerPreferencia(CHAVE);
  }
  return SecureStore.getItemAsync(CHAVE);
}

export async function gravarToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    await gravarPreferencia(CHAVE, token);
    return;
  }
  if (token === null) {
    await SecureStore.deleteItemAsync(CHAVE);
  } else {
    await SecureStore.setItemAsync(CHAVE, token);
  }
}
