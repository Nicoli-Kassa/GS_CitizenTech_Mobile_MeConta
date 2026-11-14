import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type ArgolasProps = {
  altura: number;
};

const ESPACO = 62;

/**
 * Argolas de metal na margem esquerda. Ficam por cima das folhas e não
 * giram com elas, o que dá a impressão de que a folha vira presa no arame.
 */
export function Argolas({ altura }: ArgolasProps): React.JSX.Element {
  const quantidade = Math.max(3, Math.floor((altura - 40) / ESPACO));
  const inicio = (altura - (quantidade - 1) * ESPACO) / 2;

  return (
    <View pointerEvents="none" aria-hidden style={[styles.coluna, { height: altura }]}>
      {Array.from({ length: quantidade }, (_, indice) => (
        <View key={indice} style={[styles.argola, { top: inicio + indice * ESPACO - 13 }]}>
          <Svg width={46} height={26} viewBox="0 0 46 26">
            <Defs>
              <LinearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#E9DCC3" />
                <Stop offset="0.5" stopColor="#A8927A" />
                <Stop offset="1" stopColor="#6E5B4A" />
              </LinearGradient>
            </Defs>
            {/* furo na folha */}
            <Path d="M30 13 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" fill="#2B211C" opacity={0.75} />
            {/* arame */}
            <Path d="M31 13 C 31 3, 6 2, 4 13 C 6 24, 31 23, 31 13" stroke="url(#metal)" strokeWidth={4.5} fill="none" strokeLinecap="round" />
          </Svg>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    position: 'absolute',
    left: -20,
    top: 0,
    width: 46,
  },
  argola: {
    position: 'absolute',
    left: 0,
  },
});
