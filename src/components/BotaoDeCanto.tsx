import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { Icone, type NomeIcone } from './Icone';

type BotaoDeCantoProps = {
  label: string;
  icone: NomeIcone;
  onPress: () => void;
  destaque?: boolean;
  accessibilityHint?: string;
};

/**
 * Botões redondos do canto inferior direito, por cima da mesa.
 * Diferente de um botão flutuante comum, aqui o texto aparece sempre:
 * ícone sozinho é o que mais trava quem tem pouca prática com o celular.
 */
export function BotaoDeCanto({ label, icone, onPress, destaque = false, accessibilityHint }: BotaoDeCantoProps): React.JSX.Element {
  const corTexto = destaque ? colors.tinta : colors.creme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }): ViewStyle[] => [
        styles.base,
        destaque ? styles.destaque : styles.normal,
        pressed ? styles.pressed : {},
      ]}>
      <View style={[styles.circulo, destaque ? styles.circuloDestaque : styles.circuloNormal]}>
        <Icone nome={icone} tamanho={destaque ? 28 : 24} cor={destaque ? colors.creme : colors.tinta} />
      </View>
      <Text style={[styles.label, { color: corTexto }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingLeft: spacing.xs,
    paddingRight: spacing.lg,
    borderRadius: radius.pill,
    shadowColor: colors.sombra,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  normal: {
    backgroundColor: colors.capaEscura,
    borderWidth: 1.5,
    borderColor: colors.dourado,
  },
  destaque: {
    backgroundColor: colors.dourado,
    minHeight: 58,
  },
  circulo: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  circuloNormal: {
    width: 44,
    height: 44,
    backgroundColor: colors.dourado,
  },
  circuloDestaque: {
    width: 48,
    height: 48,
    backgroundColor: colors.tinta,
  },
  label: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.lg,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
