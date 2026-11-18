import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { Icone, type NomeIcone } from './Icone';

type RecadoProps = {
  texto: string;
  tipo?: 'erro' | 'aviso' | 'sucesso' | 'info';
  titulo?: string;
};

const CORES = {
  erro: { borda: colors.erro, fundo: '#F6DCD3', icone: 'fechar' },
  aviso: { borda: '#9A6A12', fundo: '#F6E6BD', icone: 'relogio' },
  sucesso: { borda: colors.sucesso, fundo: '#DDE8CF', icone: 'pena' },
  info: { borda: colors.tintaSuave, fundo: colors.papelEscuro, icone: 'nuvem' },
} as const satisfies Record<string, { borda: string; fundo: string; icone: NomeIcone }>;

/**
 * Bilhete curto com um recado: erro, aviso, sucesso ou informação.
 * O sentido vem do texto e do ícone, não só da cor; o leitor de tela anuncia.
 */
export function Recado({ texto, tipo = 'info', titulo }: RecadoProps): React.JSX.Element {
  const cor = CORES[tipo];
  return (
    <View
      style={[styles.recado, { borderColor: cor.borda, backgroundColor: cor.fundo }]}
      accessibilityRole={tipo === 'erro' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite">
      <Icone nome={cor.icone} cor={cor.borda} tamanho={24} />
      <View style={styles.textos}>
        {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
        <Text style={styles.texto}>{texto}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderLeftWidth: 5,
    borderWidth: 1,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.tinta,
  },
});
