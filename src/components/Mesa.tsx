import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Papel } from './Papel';

type MesaProps = {
  children: ReactNode;
  edges?: readonly Edge[];
};

/** Fundo de todas as telas: a mesa escura onde o caderno fica apoiado. */
export function Mesa({ children, edges = ['top', 'bottom', 'left', 'right'] }: MesaProps): React.JSX.Element {
  return (
    <Papel textura="mesa" style={styles.mesa}>
      <SafeAreaView style={styles.area} edges={edges}>
        <View style={styles.area}>{children}</View>
      </SafeAreaView>
    </Papel>
  );
}

const styles = StyleSheet.create({
  mesa: {
    flex: 1,
  },
  area: {
    flex: 1,
  },
});
