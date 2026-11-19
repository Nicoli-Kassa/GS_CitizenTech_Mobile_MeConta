import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors, fonts, fontSize, radius, spacing, toqueMinimo } from '../theme/theme';
import { Icone } from './Icone';
import { Mesa } from './Mesa';
import { Papel } from './Papel';

type FolhaProps = {
  titulo: string;
  /** Linha pequena acima do título (ex.: "para Vó Laura"). */
  sobretitulo?: string;
  children: ReactNode;
  textura?: 'papel' | 'kraft';
  /** Botão fixo no rodapé (ação principal). */
  rodape?: ReactNode;
  /** Texto do botão de voltar. */
  voltar?: string;
};

/**
 * Folha solta que sobe por cima do caderno: usada nas telas de perguntar,
 * guardar resposta, família e bairro. O botão de fechar fica sempre no alto,
 * com texto, e o conteúdo rola com o teclado aberto.
 */
export function Folha({ titulo, sobretitulo, children, textura = 'papel', rodape, voltar = 'Fechar' }: FolhaProps): React.JSX.Element {
  return (
    <Mesa>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Papel textura={textura} style={styles.folha}>
          <View style={styles.cabecalho}>
            <View style={styles.titulos}>
              {sobretitulo ? <Text style={styles.sobretitulo}>{sobretitulo}</Text> : null}
              <Text style={styles.titulo} accessibilityRole="header">
                {titulo}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voltar}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={6}
              style={({ pressed }) => [styles.fechar, pressed ? styles.pressionado : null]}>
              <Icone nome="fechar" tamanho={20} />
              <Text style={styles.fecharTexto}>{voltar}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {rodape ? <View style={styles.rodape}>{rodape}</View> : null}
        </Papel>
      </KeyboardAvoidingView>
    </Mesa>
  );
}

/** Título de uma parte da folha, escrito à mão. */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }): React.JSX.Element {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  folha: {
    flex: 1,
    marginTop: spacing.sm,
    marginHorizontal: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.pauta,
  },
  titulos: {
    flex: 1,
  },
  sobretitulo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.1,
    color: colors.tinta,
  },
  fechar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: toqueMinimo,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.tinta,
  },
  fecharTexto: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.sm,
    color: colors.tinta,
  },
  pressionado: {
    opacity: 0.7,
  },
  conteudo: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.xl,
  },
  rodape: {
    padding: spacing.lg,
    borderTopWidth: 1.5,
    borderTopColor: colors.pauta,
  },
  secao: {
    gap: spacing.md,
  },
  secaoTitulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoMd,
    lineHeight: fontSize.manuscritoMd * 1.1,
    color: colors.tinta,
  },
});
