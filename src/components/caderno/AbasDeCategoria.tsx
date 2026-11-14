import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

import type { Categoria } from '../../types/api';
import { categoriaCores, colors, fonts, fontSize, spacing, toqueMinimo } from '../../theme/theme';

type AbasDeCategoriaProps = {
  categorias: Categoria[];
  selecionada: string | null;
  onSelecionar: (slug: string | null) => void;
};

const ROTULOS_CURTOS: Record<string, string> = {
  'historia-da-familia': 'Família',
  'o-bairro': 'Bairro',
};

/**
 * Marcadores coloridos que saem do alto da folha, um por categoria (US09).
 * Tocar num marcador abre o caderno só naquela parte.
 */
export function AbasDeCategoria({ categorias, selecionada, onSelecionar }: AbasDeCategoriaProps): React.JSX.Element {
  const itens: { slug: string | null; nome: string; rotulo: string }[] = [
    { slug: null, nome: 'Todas as memórias', rotulo: 'Tudo' },
    ...categorias.map((c) => ({ slug: c.slug, nome: c.nome, rotulo: ROTULOS_CURTOS[c.slug] ?? c.nome })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.linha}
      accessibilityRole="tablist">
      {itens.map((item) => {
        const ativa = item.slug === selecionada;
        const cor = item.slug ? (categoriaCores[item.slug] ?? { fundo: colors.tintaSuave, texto: colors.creme }) : { fundo: colors.papel, texto: colors.tinta };
        return (
          <Pressable
            key={item.slug ?? 'tudo'}
            accessibilityRole="tab"
            accessibilityLabel={item.nome}
            accessibilityState={{ selected: ativa }}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelecionar(item.slug);
            }}
            style={[styles.aba, { backgroundColor: cor.fundo }, ativa ? styles.ativa : styles.inativa]}>
            <Text style={[styles.texto, { color: cor.texto }]} maxFontSizeMultiplier={1.5}>
              {item.rotulo}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  linha: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingLeft: spacing.xxl,
    paddingRight: spacing.lg,
  },
  aba: {
    minHeight: toqueMinimo,
    minWidth: toqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  ativa: {
    paddingBottom: spacing.sm + 6,
  },
  inativa: {
    opacity: 0.9,
    marginBottom: -2,
  },
  texto: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.sm,
  },
});
