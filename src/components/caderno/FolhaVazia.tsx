import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, fontSize, spacing } from '../../theme/theme';

type FolhaVaziaProps = {
  /** Com filtro de categoria ligado, o texto fala da categoria. */
  categoriaNome: string | null;
};

/** Caderno (ou categoria) sem nenhuma página ainda. */
export function FolhaVazia({ categoriaNome }: FolhaVaziaProps): React.JSX.Element {
  return (
    <View style={styles.conteudo}>
      <Text style={styles.titulo} accessibilityRole="header">
        {categoriaNome ? `Nada em ${categoriaNome} ainda` : 'Este caderno ainda está em branco'}
      </Text>
      <Text style={styles.texto}>Faça a primeira pergunta. A resposta vira a primeira página.</Text>
      <View style={styles.seta} aria-hidden>
        <Svg width={140} height={120} viewBox="0 0 140 120">
          <Path
            d="M10 10 C 40 20, 70 40, 100 95"
            stroke={colors.tintaSuave}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray="6 8"
            fill="none"
          />
          <Path d="M86 92 L102 100 L106 82" stroke={colors.tintaSuave} strokeWidth={2.5} strokeLinecap="round" fill="none" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: spacing.xxl + spacing.lg,
    paddingRight: spacing.xl,
    gap: spacing.lg,
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.1,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  seta: {
    alignSelf: 'flex-end',
  },
});
