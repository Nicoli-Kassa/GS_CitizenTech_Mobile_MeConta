import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, fontSize, spacing } from '../theme/theme';

/**
 * Enfeites de álbum: fita adesiva, cantoneiras de foto e carimbo.
 * Tudo é decorativo e fica escondido do leitor de tela, exceto o texto do carimbo.
 */

type FitaProps = {
  largura?: number;
  rotacao?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pedaço de fita adesiva com as pontas rasgadas. */
export function Fita({ largura = 92, rotacao = -4, style }: FitaProps): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={[{ width: largura, height: 26, transform: [{ rotate: `${rotacao}deg` }] }, style]}>
      <Svg width={largura} height={26} viewBox={`0 0 ${largura} 26`}>
        <Path
          d={`M3 2 L${largura - 4} 0 L${largura - 1} 6 L${largura - 5} 12 L${largura - 1} 19 L${largura - 3} 26 L2 25 L5 18 L0 12 L4 6 Z`}
          fill={colors.fita}
        />
      </Svg>
    </View>
  );
}

type CantoneiraProps = { posicao: 'superiorEsquerda' | 'superiorDireita' | 'inferiorEsquerda' | 'inferiorDireita' };

const ROTACAO_CANTONEIRA = {
  superiorEsquerda: '0deg',
  superiorDireita: '90deg',
  inferiorDireita: '180deg',
  inferiorEsquerda: '270deg',
} as const;

/** Cantoneira de papel preto que segura a foto no álbum. */
export function Cantoneira({ posicao }: CantoneiraProps): React.JSX.Element {
  const lado = posicao.includes('Esquerda') ? { left: -6 } : { right: -6 };
  const altura = posicao.includes('superior') ? { top: -6 } : { bottom: -6 };
  return (
    <View
      pointerEvents="none"
      style={[styles.cantoneira, lado, altura, { transform: [{ rotate: ROTACAO_CANTONEIRA[posicao] }] }]}>
      <Svg width={30} height={30} viewBox="0 0 30 30">
        <Path d="M0 0 L30 0 L0 30 Z" fill="#2A1E17" opacity={0.92} />
      </Svg>
    </View>
  );
}

type CarimboProps = {
  texto: string;
  cor?: string;
  rotacao?: number;
};

/** Carimbo de borracha com o apelido do idoso. */
export function Carimbo({ texto, cor = colors.capa, rotacao = -6 }: CarimboProps): React.JSX.Element {
  return (
    <View style={[styles.carimbo, { borderColor: cor, transform: [{ rotate: `${rotacao}deg` }] }]}>
      <Text style={[styles.carimboTexto, { color: cor }]} maxFontSizeMultiplier={1.6}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cantoneira: {
    position: 'absolute',
    width: 30,
    height: 30,
  },
  carimbo: {
    alignSelf: 'flex-start',
    borderWidth: 2.5,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    opacity: 0.92,
  },
  carimboTexto: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
