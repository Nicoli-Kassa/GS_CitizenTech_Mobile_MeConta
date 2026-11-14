import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, fontSize, radius, spacing } from '../../theme/theme';
import { Papel } from '../Papel';

type CapaProps = {
  nomeDaFamilia: string;
  onAbrir: () => void;
};

/**
 * Capa de tecido do caderno, com lombada costurada, cantos de metal,
 * elástico e a etiqueta de papel com o nome da família.
 */
export function Capa({ nomeDaFamilia, onAbrir }: CapaProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir o caderno da ${nomeDaFamilia}`}
      style={StyleSheet.absoluteFill}>
      <Papel textura="capa" style={styles.capa}>
        <View style={styles.lombada} aria-hidden>
          <View style={styles.costura} />
        </View>
        <Canto posicao="superior" />
        <Canto posicao="inferior" />
        <View style={styles.elastico} aria-hidden />

        <View style={styles.centro}>
          <Papel style={styles.etiqueta}>
            <Text style={styles.etiquetaTopo}>caderno da</Text>
            <Text style={styles.etiquetaNome} adjustsFontSizeToFit numberOfLines={2}>
              {nomeDaFamilia}
            </Text>
            <View style={styles.sublinhado} />
            <Text style={styles.etiquetaRodape}>histórias que só a nossa família sabe</Text>
          </Papel>
        </View>

        <Text style={styles.convite}>toque para abrir</Text>
      </Papel>
    </Pressable>
  );
}

function Canto({ posicao }: { posicao: 'superior' | 'inferior' }): React.JSX.Element {
  return (
    <View
      aria-hidden
      pointerEvents="none"
      style={[styles.canto, posicao === 'superior' ? { top: 0 } : { bottom: 0, transform: [{ scaleY: -1 }] }]}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Path d="M0 0 L44 0 Q44 6 38 6 L6 38 Q0 44 0 44 Z" fill={colors.dourado} opacity={0.85} transform="translate(44,0) scale(-1,1)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: {
    flex: 1,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  lombada: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 28,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  costura: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    right: 6,
    borderRightWidth: 1.5,
    borderColor: colors.dourado,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  canto: {
    position: 'absolute',
    right: 0,
  },
  elastico: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 34,
    width: 10,
    backgroundColor: colors.capaEscura,
    opacity: 0.9,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 28,
    paddingRight: 44,
  },
  etiqueta: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.dourado,
    transform: [{ rotate: '-1.5deg' }],
  },
  etiquetaTopo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  etiquetaNome: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoXl,
    lineHeight: fontSize.manuscritoXl * 1.08,
    color: colors.tinta,
    textAlign: 'center',
  },
  sublinhado: {
    width: '70%',
    height: 2,
    backgroundColor: colors.capa,
    marginVertical: spacing.xs,
    transform: [{ rotate: '-1deg' }],
  },
  etiquetaRodape: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
    textAlign: 'center',
  },
  convite: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 28,
    right: 44,
    textAlign: 'center',
    fontFamily: fonts.maquina,
    fontSize: fontSize.md,
    color: colors.dourado,
  },
});
