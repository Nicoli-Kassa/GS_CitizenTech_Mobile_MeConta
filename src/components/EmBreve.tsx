import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { Botao } from './Botao';
import { Mesa } from './Mesa';
import { Papel } from './Papel';

type EmBreveProps = {
  titulo: string;
  texto: string;
};

/** Tela provisória das partes que chegam nas próximas etapas. */
export function EmBreve({ titulo, texto }: EmBreveProps): React.JSX.Element {
  return (
    <Mesa>
      <View style={styles.centro}>
        <Papel style={styles.cartao}>
          <Text style={styles.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          <Text style={styles.texto}>{texto}</Text>
          <Botao label="Voltar ao caderno" variante="papel" icone="anterior" onPress={() => router.back()} />
        </Papel>
      </View>
    </Mesa>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  cartao: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
});
