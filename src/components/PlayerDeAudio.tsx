import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { formatarDuracao } from '../utils/regras';
import { Icone } from './Icone';

type PlayerDeAudioProps = {
  /** Arquivo no celular. `null` enquanto o áudio não foi baixado. */
  fonte: string | null;
  apelido: string;
  duracaoSegundos: number;
};

/**
 * Botão grande "Ouvir", com a linha do tempo do áudio logo abaixo.
 * O leitor de tela anuncia o nome de quem fala e quanto tempo dura.
 */
export function PlayerDeAudio({ fonte, apelido, duracaoSegundos }: PlayerDeAudioProps): React.JSX.Element {
  const player = useAudioPlayer(fonte ? { uri: fonte } : null);
  const status = useAudioPlayerStatus(player);

  const duracao = status.duration > 0 ? status.duration : duracaoSegundos;
  const progresso = duracao > 0 ? Math.min(1, status.currentTime / duracao) : 0;
  const tocando = status.playing;

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish, player]);

  const alternar = (): void => {
    if (tocando) {
      player.pause();
    } else {
      player.play();
    }
  };

  if (!fonte) {
    return (
      <View style={[styles.botao, styles.indisponivel]} accessibilityRole="text">
        <Icone nome="nuvem" cor={colors.tintaSuave} />
        <Text style={styles.textoIndisponivel}>O áudio aparece quando o celular tiver internet</Text>
      </View>
    );
  }

  const rotulo = tocando ? `Pausar a voz de ${apelido}` : `Ouvir ${apelido}`;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        accessibilityHint={`Áudio de ${formatarDuracao(duracao)}`}
        accessibilityState={{ busy: !status.isLoaded }}
        onPress={alternar}
        style={({ pressed }): ViewStyle[] => [styles.botao, pressed ? styles.pressed : {}]}>
        <View style={styles.circulo}>
          <Icone nome={tocando ? 'pausar' : 'ouvir'} cor={colors.creme} tamanho={28} />
        </View>
        <Text style={styles.texto} numberOfLines={2}>
          {tocando ? 'Pausar' : `Ouvir ${apelido}`}
        </Text>
      </Pressable>
      <View style={styles.linhaDoTempo} aria-hidden>
        <View style={styles.trilho}>
          <View style={[styles.preenchido, { width: `${progresso * 100}%` }]} />
        </View>
        <Text style={styles.tempo}>
          {formatarDuracao(status.currentTime)} / {formatarDuracao(duracao)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.kraft,
    borderWidth: 1.5,
    borderColor: colors.tinta,
    borderStyle: 'dashed',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  circulo: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    flexShrink: 1,
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.lg,
    color: colors.tinta,
  },
  linhaDoTempo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  trilho: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.pauta,
    overflow: 'hidden',
  },
  preenchido: {
    height: 4,
    backgroundColor: colors.tinta,
  },
  tempo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  indisponivel: {
    backgroundColor: colors.papelEscuro,
    borderStyle: 'solid',
    borderColor: colors.pauta,
  },
  textoIndisponivel: {
    flexShrink: 1,
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
});
