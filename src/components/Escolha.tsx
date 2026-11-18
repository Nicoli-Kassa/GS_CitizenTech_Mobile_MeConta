import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing, toqueMinimo } from '../theme/theme';

export type OpcaoDeEscolha<T extends string | number> = {
  valor: T;
  rotulo: string;
  /** Cor da etiqueta (ex.: cor da categoria). */
  fundo?: string;
  texto?: string;
  dica?: string;
};

type EscolhaProps<T extends string | number> = {
  label: string;
  opcoes: readonly OpcaoDeEscolha<T>[];
  valor: T | null;
  onChange: (valor: T) => void;
};

/** Etiquetas para escolher uma opção (idoso, categoria). Funciona como grupo de rádio. */
export function Escolha<T extends string | number>({ label, opcoes, valor, onChange }: EscolhaProps<T>): React.JSX.Element {
  return (
    <View style={styles.wrapper} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.linha}>
        {opcoes.map((opcao) => {
          const ativa = opcao.valor === valor;
          const fundo = opcao.fundo ?? colors.papel;
          const corTexto = opcao.texto ?? colors.tinta;
          return (
            <Pressable
              key={String(opcao.valor)}
              accessibilityRole="radio"
              accessibilityLabel={opcao.dica ? `${opcao.rotulo}, ${opcao.dica}` : opcao.rotulo}
              accessibilityState={{ selected: ativa, checked: ativa }}
              onPress={() => onChange(opcao.valor)}
              style={[
                styles.etiqueta,
                { backgroundColor: ativa ? fundo : 'transparent', borderColor: opcao.fundo ?? colors.tinta },
                ativa ? styles.ativa : null,
              ]}>
              <Text style={[styles.texto, { color: ativa ? corTexto : colors.tinta }]}>
                {ativa ? '✓ ' : ''}
                {opcao.rotulo}
              </Text>
              {opcao.dica ? <Text style={[styles.dica, { color: ativa ? corTexto : colors.tintaSuave }]}>{opcao.dica}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  etiqueta: {
    minHeight: toqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 2,
  },
  ativa: {
    transform: [{ rotate: '-1.5deg' }],
  },
  texto: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
  },
  dica: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm - 2,
  },
});
