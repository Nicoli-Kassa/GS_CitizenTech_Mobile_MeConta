import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { FolhaEsperando } from '../../types/caderno';
import { colors, fonts, fontSize, spacing } from '../../theme/theme';
import { formatarData } from '../../utils/regras';
import { Botao } from '../Botao';
import { Fita } from '../Enfeites';
import { Icone } from '../Icone';

type FolhaEsperandoViewProps = {
  folha: FolhaEsperando;
  categoriaNome: string | null;
};

/**
 * Pergunta enviada que ainda não tem resposta: uma página em branco,
 * com a pergunta escrita no alto, esperando o áudio do idoso.
 */
export function FolhaEsperandoView({ folha, categoriaNome }: FolhaEsperandoViewProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
      <View style={styles.bilhete}>
        <Fita style={styles.fita} rotacao={3} largura={80} />
        <View style={styles.cabecalho}>
          <Icone nome="envelope" cor={colors.capa} />
          <Text style={styles.rotulo}>
            Enviada para {folha.idosoApelido} em {formatarData(folha.enviadoEm)}
          </Text>
        </View>
        <Text style={styles.pergunta} accessibilityRole="header">
          {folha.pergunta}
        </Text>
        {categoriaNome ? <Text style={styles.categoria}>{categoriaNome}</Text> : null}
      </View>

      <Text style={styles.explicacao}>
        Esta página está esperando a resposta. Quando {folha.idosoApelido} mandar o áudio no WhatsApp, guarde aqui.
      </Text>

      <Botao
        label="Guardar a resposta"
        icone="pena"
        onPress={() => router.push({ pathname: '/resposta/[envioId]', params: { envioId: String(folha.envioId) } })}
        accessibilityHint={`Escolhe o áudio de ${folha.idosoApelido} para colar nesta página`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingLeft: spacing.xxl + spacing.lg,
    paddingRight: spacing.lg,
    gap: spacing.xl,
  },
  bilhete: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: '#FFFDF6',
    transform: [{ rotate: '-1.5deg' }],
    shadowColor: colors.sombra,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  fita: {
    position: 'absolute',
    top: -12,
    right: 24,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rotulo: {
    flexShrink: 1,
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  pergunta: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.12,
    color: colors.tinta,
  },
  categoria: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  explicacao: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
});
