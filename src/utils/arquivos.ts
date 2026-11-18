import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';

import { AppError } from './errors';
import { EXTENSOES_AUDIO, LIMITE_AUDIO_BYTES, MENSAGENS } from './regras';

/**
 * Arquivos escolhidos pela família: conferência do áudio (formato e tamanho,
 * US08), duração e cópia para a pasta do app, para a página continuar
 * funcionando sem internet e depois de limpar o cache (US10).
 */

export function extensaoDe(nome: string): string {
  const final = nome.split('/').pop() ?? '';
  return final.includes('.') ? (final.split('.').pop()?.toLowerCase().split('?')[0] ?? '') : '';
}

/** Mesmas regras da API: mp3, m4a, ogg ou opus, até 20 MB. */
export function validarAudio(nome: string, tamanho: number | undefined): void {
  if (!(EXTENSOES_AUDIO as readonly string[]).includes(extensaoDe(nome))) {
    throw new AppError(MENSAGENS.arquivoNaoEhAudio);
  }
  if (tamanho !== undefined && tamanho > LIMITE_AUDIO_BYTES) {
    throw new AppError(MENSAGENS.audioGrande);
  }
}

/**
 * Descobre quanto o áudio dura abrindo um player sem tocar.
 * O iPhone não abre .opus/.ogg (formato do WhatsApp): nesse caso a duração é
 * estimada pelo tamanho do arquivo (áudio de voz do WhatsApp: cerca de 2 KB por segundo).
 */
export function medirDuracao(uri: string, tamanho: number | undefined): Promise<{ segundos: number; estimada: boolean }> {
  const estimativa = (): { segundos: number; estimada: boolean } => ({
    segundos: Math.max(1, Math.round((tamanho ?? 30000) / 2000)),
    estimada: true,
  });
  return new Promise((resolve) => {
    let player: ReturnType<typeof createAudioPlayer> | null = null;
    let terminou = false;
    const terminar = (resultado: { segundos: number; estimada: boolean }): void => {
      if (terminou) {
        return;
      }
      terminou = true;
      clearTimeout(timer);
      try {
        player?.remove();
      } catch {
        // Player já liberado.
      }
      resolve(resultado);
    };
    const timer = setTimeout(() => terminar(estimativa()), 4000);
    try {
      player = createAudioPlayer({ uri });
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.duration > 0) {
          terminar({ segundos: status.duration, estimada: false });
        }
      });
    } catch {
      terminar(estimativa());
    }
  });
}

/** Copia o arquivo para a pasta do app (o cache do seletor pode ser apagado pelo sistema). */
export function guardarNoApp(uri: string, nome: string): string {
  if (Platform.OS === 'web') {
    return uri;
  }
  const pasta = new Directory(Paths.document, 'midia');
  pasta.create({ intermediates: true, idempotent: true });
  const destino = new File(pasta, nome);
  if (destino.exists) {
    destino.delete();
  }
  new File(uri).copy(destino);
  return destino.uri;
}
