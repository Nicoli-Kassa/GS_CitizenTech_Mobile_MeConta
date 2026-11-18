import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carimbo, Fita } from '../components/Enfeites';
import { Folha } from '../components/Folha';
import { Ilustracao } from '../components/Ilustracao';
import { PlayerDeAudio } from '../components/PlayerDeAudio';
import { Recado } from '../components/Recado';
import { CATEGORIAS } from '../services/api/catalogo';
import { api } from '../services/api';
import type { MemoriaDoBairro } from '../types/api';
import { colors, fonts, fontSize, spacing } from '../theme/theme';
import { describeError } from '../utils/errors';
import { formatarData } from '../utils/regras';

/**
 * Caderno do bairro (US17): as memórias que as famílias publicaram, com a
 * autorização da pessoa idosa e depois do filtro de dados pessoais.
 * Aberto a qualquer morador; nunca mostra telefone, nome completo ou endereço.
 */
export default function BairroScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ bairro?: string }>();
  const [bairro, setBairro] = useState(params.bairro ?? 'Pirituba');
  const [procurado, setProcurado] = useState(params.bairro ?? 'Pirituba');
  const [memorias, setMemorias] = useState<MemoriaDoBairro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (nome: string) => {
    setCarregando(true);
    setErro(null);
    try {
      setMemorias(await api.listarMemoriasDoBairro(nome));
    } catch (falha) {
      setMemorias([]);
      setErro(describeError(falha, 'Não foi possível abrir o caderno do bairro.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Carrega fora do corpo do efeito: o estado muda só depois da resposta.
    void Promise.resolve(procurado).then(carregar);
  }, [carregar, procurado]);

  return (
    <Folha titulo={`Memórias de ${procurado}`} sobretitulo="caderno do bairro" textura="kraft" voltar="Voltar">
      <Text style={styles.texto}>
        Histórias que os avós do bairro contaram e as famílias decidiram dividir com os vizinhos.
      </Text>
      <View style={styles.busca}>
        <Campo label="Bairro" value={bairro} onChangeText={setBairro} returnKeyType="search" onSubmitEditing={() => setProcurado(bairro.trim())} />
        <Botao label="Abrir este bairro" variante="papel" onPress={() => setProcurado(bairro.trim())} />
      </View>

      {carregando ? <ActivityIndicator color={colors.tinta} /> : null}
      {erro ? <Recado tipo="erro" texto={erro} /> : null}
      {!carregando && !erro && memorias.length === 0 ? (
        <Recado texto={`Ainda não há memórias publicadas em ${procurado}. A primeira pode ser de alguém da sua família.`} />
      ) : null}

      {memorias.map((memoria, indice) => (
        <CartaoDeMemoria key={memoria.id} memoria={memoria} inclinacao={indice % 2 === 0 ? -1.2 : 1} />
      ))}
    </Folha>
  );
}

function CartaoDeMemoria({ memoria, inclinacao }: { memoria: MemoriaDoBairro; inclinacao: number }): React.JSX.Element {
  const [audio, setAudio] = useState<string | null>(null);
  const categoria = CATEGORIAS.find((c) => c.id === memoria.categoriaId);

  useEffect(() => {
    let ativo = true;
    void api
      .enderecoDoAudioPublico(memoria.audioUrl)
      .then((uri) => {
        if (ativo) {
          setAudio(uri);
        }
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [memoria.audioUrl]);

  return (
    <View style={[styles.cartao, { transform: [{ rotate: `${inclinacao}deg` }] }]}>
      <Fita style={styles.fita} largura={80} rotacao={-inclinacao * 3} />
      <View style={styles.topo}>
        <Carimbo texto={memoria.apelido} />
        <Text style={styles.data}>{formatarData(memoria.publicadaEm)}</Text>
      </View>
      <View style={styles.desenho} aria-hidden>
        <Ilustracao categoriaSlug={categoria?.slug ?? null} largura={150} />
      </View>
      <Text style={styles.titulo} accessibilityRole="header">
        {memoria.titulo}
      </Text>
      {memoria.transcricao ? <Text style={styles.texto}>{memoria.transcricao}</Text> : null}
      <PlayerDeAudio fonte={audio} apelido={memoria.apelido} duracaoSegundos={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  busca: {
    gap: spacing.sm,
  },
  cartao: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.papel,
    shadowColor: colors.sombra,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
  },
  fita: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
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
  desenho: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.papelEscuro,
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.1,
    color: colors.tinta,
  },
});
