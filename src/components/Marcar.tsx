import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, fontSize, spacing, toqueMinimo } from '../theme/theme';

type MarcarProps = {
  label: string;
  marcado: boolean;
  onChange: (marcado: boolean) => void;
};

/** Caixinha de marcar desenhada à mão. A linha inteira é tocável. */
export function Marcar({ label, marcado, onChange }: MarcarProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: marcado }}
      onPress={() => onChange(!marcado)}
      style={styles.linha}>
      <View style={[styles.caixa, marcado ? styles.caixaMarcada : null]}>
        {marcado ? (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M4 13 L9.5 18.5 L20 5.5" stroke={colors.creme} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        ) : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: toqueMinimo,
  },
  caixa: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: colors.tinta,
    backgroundColor: '#FFFDF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: {
    backgroundColor: colors.tinta,
  },
  label: {
    flex: 1,
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.tinta,
  },
});
