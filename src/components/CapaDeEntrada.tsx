import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { Mesa } from './Mesa';
import { Papel } from './Papel';

type CapaDeEntradaProps = {
  subtitulo: string;
  children: ReactNode;
};

/** Capa de tecido com a etiqueta de papel: o fundo do login, do cadastro e das boas-vindas. */
export function CapaDeEntrada({ subtitulo, children }: CapaDeEntradaProps): React.JSX.Element {
  return (
    <Mesa>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled">
          <Papel textura="capa" style={styles.capa}>
            <View style={styles.lombada} aria-hidden />
            <Text style={styles.marca} accessibilityRole="header">
              Me Conta
            </Text>
            <Text style={styles.subtitulo}>{subtitulo}</Text>
            <Papel style={styles.etiqueta}>{children}</Papel>
          </Papel>
        </ScrollView>
      </KeyboardAvoidingView>
    </Mesa>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  rolagem: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  capa: {
    paddingVertical: spacing.xl,
    paddingLeft: spacing.xl + 18,
    paddingRight: spacing.lg,
    borderRadius: radius.md,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    gap: spacing.md,
  },
  lombada: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 22,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  marca: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoXl + 6,
    color: colors.dourado,
  },
  subtitulo: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.creme,
  },
  etiqueta: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.dourado,
    gap: spacing.lg,
  },
});
