import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, fontSize, radius, spacing, toqueMinimo } from '../theme/theme';

type CampoProps = TextInputProps & {
  label: string;
  /** Texto de ajuda abaixo do campo. */
  dica?: string | null;
  /** Erro do campo: aparece em vermelho e é lido pelo leitor de tela. */
  erro?: string | null;
};

/** Campo de texto escrito à mão numa linha do caderno, com rótulo sempre visível. */
export function Campo({
  label,
  dica = null,
  erro = null,
  style,
  multiline,
  onFocus,
  onBlur,
  ...props
}: CampoProps): React.JSX.Element {
  const [focado, setFocado] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={erro ?? dica ?? undefined}
        placeholderTextColor={colors.tintaSuave}
        multiline={multiline}
        onFocus={(e) => {
          setFocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocado(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline ? styles.multilinha : null, focado ? styles.focado : null, erro ? styles.comErro : null, style]}
        {...props}
      />
      {erro ? (
        <Text style={styles.erro} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {erro}
        </Text>
      ) : dica ? (
        <Text style={styles.dica}>{dica}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  input: {
    minHeight: toqueMinimo + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.tintaSuave,
    backgroundColor: '#FFFDF6',
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  multilinha: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  focado: {
    borderColor: colors.tinta,
    borderWidth: 2.5,
  },
  comErro: {
    borderColor: colors.erro,
  },
  erro: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.sm,
    color: colors.erro,
  },
  dica: {
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
});
