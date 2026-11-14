import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, fontSize, radius, spacing, toqueMinimo } from '../theme/theme';
import { Icone, type NomeIcone } from './Icone';

export type BotaoVariante = 'tinta' | 'papel' | 'contorno';

type BotaoProps = {
  label: string;
  onPress: () => void;
  variante?: BotaoVariante;
  icone?: NomeIcone;
  isLoading?: boolean;
  disabled?: boolean;
  /** Explica por que o botão está desativado (lido também pelo leitor de tela). */
  helperText?: string | null;
  accessibilityHint?: string;
};

/** Botão padrão: etiqueta de papel com texto sempre visível ao lado do ícone. */
export function Botao({
  label,
  onPress,
  variante = 'tinta',
  icone,
  isLoading = false,
  disabled = false,
  helperText = null,
  accessibilityHint,
}: BotaoProps): React.JSX.Element {
  const isDisabled = disabled || isLoading;
  const corTexto = variante === 'tinta' ? colors.creme : colors.tinta;

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={helperText ?? accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }): ViewStyle[] => [
          styles.base,
          VARIANTES[variante],
          pressed && !isDisabled ? styles.pressed : {},
          isDisabled ? styles.disabled : {},
        ]}>
        {isLoading ? (
          <ActivityIndicator color={corTexto} />
        ) : (
          <View style={styles.conteudo}>
            {icone ? <Icone nome={icone} cor={corTexto} /> : null}
            <Text style={[styles.label, { color: corTexto }]}>{label}</Text>
          </View>
        )}
      </Pressable>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  base: {
    minHeight: 56,
    minWidth: toqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
  helper: {
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
    textAlign: 'center',
  },
});

const VARIANTES: Record<BotaoVariante, ViewStyle> = {
  tinta: { backgroundColor: colors.tinta },
  papel: { backgroundColor: colors.papel, borderWidth: 1.5, borderColor: colors.tinta },
  contorno: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.tinta },
};
