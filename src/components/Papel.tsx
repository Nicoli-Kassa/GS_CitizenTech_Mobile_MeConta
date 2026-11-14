import React, { type ReactNode } from 'react';
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, texturas } from '../theme/theme';

type PapelProps = {
  children?: ReactNode;
  textura?: keyof typeof texturas;
  /** Desenha as linhas pautadas do caderno. */
  pautado?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ESPACO_DA_PAUTA = 34;

/** Cor média de cada textura: aparece por baixo dela, caso a repetição não cubra tudo. */
const COR_DE_FUNDO: Record<keyof typeof texturas, string> = {
  papel: colors.papel,
  kraft: colors.kraft,
  capa: colors.capa,
  mesa: colors.mesa,
};

/** Superfície de papel (ou de tecido) com a textura repetida por baixo do conteúdo. */
export function Papel({ children, textura = 'papel', pautado = false, style }: PapelProps): React.JSX.Element {
  return (
    <ImageBackground
      source={texturas[textura]}
      resizeMode="repeat"
      style={[styles.base, { backgroundColor: COR_DE_FUNDO[textura] }, style]}
      imageStyle={styles.imagem}>
      {pautado ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 40 }, (_, indice) => (
            <View key={indice} style={[styles.linha, { top: 96 + indice * ESPACO_DA_PAUTA }]} />
          ))}
          <View style={styles.margem} />
        </View>
      ) : null}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  imagem: {
    // Sem isso, no Android a textura repetida fica borrada.
    resizeMode: 'repeat',
  },
  linha: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.pauta,
    opacity: 0.7,
  },
  margem: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 46,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: '#C98E7E',
    opacity: 0.45,
  },
});
