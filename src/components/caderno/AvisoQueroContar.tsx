import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import type { Aviso } from '../../types/api';
import { colors, fonts, fontSize, radius, spacing } from '../../theme/theme';
import { Botao } from '../Botao';
import { Fita } from '../Enfeites';

type AvisoQueroContarProps = {
  aviso: Aviso;
  onGuardar: (envioId: number) => void;
  onVisto: () => void;
};

/**
 * Bilhete que aparece por cima do caderno quando a pessoa idosa aperta
 * "quero contar" no porta-retrato: é a hora de ligar ou pedir o áudio.
 */
export function AvisoQueroContar({ aviso, onGuardar, onVisto }: AvisoQueroContarProps): React.JSX.Element {
  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutUp.duration(250)} style={styles.bilhete}>
      <Fita style={styles.fita} largura={70} rotacao={4} />
      <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.textos}>
        <Text style={styles.titulo}>{aviso.apelido} quer contar!</Text>
        <Text style={styles.texto}>
          Apertou o botão do porta-retrato
          {aviso.pergunta ? ` para responder: “${aviso.pergunta}”` : '.'} Ligue ou peça o áudio no WhatsApp.
        </Text>
      </View>
      <View style={styles.botoes}>
        {aviso.envioId !== null ? (
          <Botao label="Guardar a resposta" icone="pena" onPress={() => onGuardar(aviso.envioId ?? 0)} />
        ) : null}
        <Botao label="Já vi" variante="contorno" onPress={onVisto} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bilhete: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: '#FFF3C4',
    borderRadius: radius.sm,
    transform: [{ rotate: '-0.8deg' }],
    shadowColor: colors.sombra,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fita: {
    position: 'absolute',
    top: -12,
    left: 24,
  },
  textos: {
    gap: spacing.xs,
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoMd,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.tinta,
  },
  botoes: {
    gap: spacing.sm,
  },
});
