import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { FolhaMemoria } from '../../types/caderno';
import { colors, fonts, fontSize, spacing } from '../../theme/theme';
import { formatarData } from '../../utils/regras';
import { Cantoneira, Carimbo, Fita } from '../Enfeites';
import { Icone } from '../Icone';
import { Ilustracao } from '../Ilustracao';
import { PlayerDeAudio } from '../PlayerDeAudio';

type FolhaMemoriaViewProps = {
  folha: FolhaMemoria;
  categoriaSlug: string | null;
  categoriaNome: string | null;
  largura: number;
  /** Só a folha visível carrega o áudio. */
  ativa: boolean;
};

/** Uma memória do caderno: foto (ou desenho), título manuscrito, a pergunta e a voz. */
export function FolhaMemoriaView({ folha, categoriaSlug, categoriaNome, largura, ativa }: FolhaMemoriaViewProps): React.JSX.Element {
  const larguraFoto = Math.min(largura * 0.72, 300);

  return (
    <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
      <View style={styles.topo}>
        <Text style={styles.data}>{formatarData(folha.criadaEm)}</Text>
        <Carimbo texto={folha.idosoApelido} />
      </View>

      <View style={[styles.foto, { width: larguraFoto }]}>
        {folha.fotoLocal ? (
          <Image
            source={{ uri: folha.fotoLocal }}
            style={{ width: larguraFoto - 20, height: (larguraFoto - 20) * 0.75 }}
            contentFit="cover"
            accessibilityLabel={`Foto da memória "${folha.titulo}"`}
          />
        ) : (
          <View style={styles.esboco} aria-hidden>
            <Ilustracao categoriaSlug={categoriaSlug} largura={larguraFoto - 40} />
          </View>
        )}
        <Cantoneira posicao="superiorEsquerda" />
        <Cantoneira posicao="superiorDireita" />
        <Cantoneira posicao="inferiorEsquerda" />
        <Cantoneira posicao="inferiorDireita" />
        <Fita style={styles.fita} />
      </View>

      <Text style={styles.titulo} accessibilityRole="header">
        {folha.titulo}
      </Text>

      <View style={styles.pergunta}>
        <Text style={styles.rotulo}>{categoriaNome ? `${categoriaNome} · a pergunta` : 'A pergunta'}</Text>
        <Text style={styles.textoPergunta}>“{folha.pergunta}”</Text>
      </View>

      {ativa ? (
        <PlayerDeAudio fonte={folha.audioLocal} apelido={folha.idosoApelido} duracaoSegundos={folha.duracaoSegundos} />
      ) : (
        <View style={styles.reservaPlayer} />
      )}

      {folha.aguardandoEnvio ? (
        <View style={styles.aviso}>
          <Icone nome="relogio" tamanho={22} cor={colors.tintaSuave} />
          <Text style={styles.textoAviso}>Guardada no celular. Vai para a nuvem quando tiver internet.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingLeft: spacing.xxl + spacing.sm,
    paddingRight: spacing.lg,
    gap: spacing.lg,
  },
  topo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  data: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  foto: {
    alignSelf: 'center',
    padding: 10,
    backgroundColor: '#FFFDF6',
    transform: [{ rotate: '-2deg' }],
    shadowColor: colors.sombra,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
    marginTop: spacing.sm,
  },
  esboco: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.papelEscuro,
  },
  fita: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.1,
    color: colors.tinta,
  },
  pergunta: {
    gap: spacing.xs,
  },
  rotulo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  textoPergunta: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.45,
    color: colors.tinta,
  },
  reservaPlayer: {
    height: 96,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textoAviso: {
    flexShrink: 1,
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
});
