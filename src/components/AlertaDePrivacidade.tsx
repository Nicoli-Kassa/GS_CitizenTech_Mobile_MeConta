import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { AlertaDeRisco, NivelDeRisco } from '../types/api';
import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';

const NIVEL: Record<NivelDeRisco, { rotulo: string; cor: string; fundo: string }> = {
  Alto: { rotulo: 'risco alto', cor: colors.erro, fundo: '#F6DCD3' },
  Medio: { rotulo: 'risco médio', cor: '#7A520C', fundo: '#F6E6BD' },
  Baixo: { rotulo: 'risco baixo', cor: colors.sucesso, fundo: '#DDE8CF' },
};

export function rotuloDoNivel(nivel: NivelDeRisco): string {
  return NIVEL[nivel].rotulo;
}

/**
 * Um alerta do filtro de dados pessoais, em linguagem simples (US18):
 * o que foi encontrado (sempre mascarado), o risco real e o que fazer.
 */
export function AlertaDePrivacidade({ alerta }: { alerta: AlertaDeRisco }): React.JSX.Element {
  const nivel = NIVEL[alerta.nivel];
  return (
    <View style={[styles.cartao, { borderColor: nivel.cor, backgroundColor: nivel.fundo }]} accessible accessibilityRole="summary">
      <View style={styles.topo}>
        <Text style={styles.rotulo}>{alerta.rotulo}</Text>
        <Text style={[styles.nivel, { color: nivel.cor, borderColor: nivel.cor }]}>{nivel.rotulo}</Text>
      </View>
      <Text style={styles.alerta}>{alerta.alerta}</Text>
      {alerta.trechos.length > 0 ? (
        <Text style={styles.trecho} accessibilityLabel={`Trecho encontrado, escondido: ${alerta.trechos.join(', ')}`}>
          {alerta.trechos.map((t) => `“${t}”`).join('  ')}
        </Text>
      ) : null}
      <Text style={styles.paragrafo}>
        <Text style={styles.negrito}>Por que importa: </Text>
        {alerta.riscoReal}
      </Text>
      <Text style={styles.paragrafo}>
        <Text style={styles.negrito}>O que fazer: </Text>
        {alerta.oQueFazer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderLeftWidth: 6,
  },
  topo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rotulo: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  nivel: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
  },
  alerta: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.tinta,
  },
  trecho: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  paragrafo: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.45,
    color: colors.tinta,
  },
  negrito: {
    fontFamily: fonts.livroNegrito,
  },
});
