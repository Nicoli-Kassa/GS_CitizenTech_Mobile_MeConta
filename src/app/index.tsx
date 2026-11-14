import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BotaoDeCanto } from '../components/BotaoDeCanto';
import { Botao } from '../components/Botao';
import { AbasDeCategoria } from '../components/caderno/AbasDeCategoria';
import { Caderno } from '../components/caderno/Caderno';
import { Capa } from '../components/caderno/Capa';
import { FolhaEsperandoView } from '../components/caderno/FolhaEsperandoView';
import { FolhaMemoriaView } from '../components/caderno/FolhaMemoriaView';
import { FolhaVazia } from '../components/caderno/FolhaVazia';
import { Mesa } from '../components/Mesa';
import { Papel } from '../components/Papel';
import { USANDO_MOCK } from '../config/appConfig';
import { useSessao } from '../contexts/SessaoContext';
import { useCaderno } from '../hooks/useCaderno';
import { useMovimentoReduzido } from '../hooks/useMovimentoReduzido';
import { chaveDaFolha, type Folha } from '../types/caderno';
import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';

/**
 * Tela inicial: o caderno da família.
 *
 * Abre fechado, com a capa e o nome da família. Um toque abre a capa e
 * mostra as folhas: perguntas esperando resposta primeiro, depois as
 * memórias da mais recente para a mais antiga.
 */
export default function CadernoScreen(): React.JSX.Element {
  const sessao = useSessao();

  if (sessao.status === 'iniciando') {
    return (
      <Mesa>
        <View style={styles.centro} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.dourado} size="large" />
          <Text style={styles.carregando}>Abrindo o caderno…</Text>
        </View>
      </Mesa>
    );
  }

  if (sessao.status !== 'pronto' || !sessao.familia) {
    return <SemCaderno />;
  }

  return <CadernoAberto familiaId={sessao.familia.id} nomeDaFamilia={sessao.familia.nome} />;
}

/** Login, perfil e criação da família chegam na Etapa 3. */
function SemCaderno(): React.JSX.Element {
  const { status, error, entrar } = useSessao();
  const mensagem =
    status === 'sem-familia'
      ? 'Você ainda não tem um caderno de família.'
      : status === 'sem-perfil'
        ? 'Falta criar o seu perfil.'
        : (error ?? 'Entre na sua conta para abrir o caderno.');
  return (
    <Mesa>
      <View style={styles.centro}>
        <Papel style={styles.cartao}>
          <Text style={styles.cartaoTitulo} accessibilityRole="header">
            Me Conta
          </Text>
          <Text style={styles.cartaoTexto}>{mensagem}</Text>
          {USANDO_MOCK ? (
            <Botao
              label="Entrar na demonstração"
              onPress={() => void entrar('bia@example.com', 'MeConta@2026').catch(() => undefined)}
            />
          ) : null}
        </Papel>
      </View>
    </Mesa>
  );
}

type CadernoAbertoProps = {
  familiaId: number;
  nomeDaFamilia: string;
};

function CadernoAberto({ familiaId, nomeDaFamilia }: CadernoAbertoProps): React.JSX.Element {
  const { sincronizando, online } = useSessao();
  const { folhas, categorias, isLoading } = useCaderno(familiaId);
  const reduzido = useMovimentoReduzido();

  const [filtro, setFiltro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [area, setArea] = useState<{ largura: number; altura: number } | null>(null);
  const abertura = useSharedValue(0);

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const folhasFiltradas = useMemo(() => {
    if (!filtro) {
      return folhas;
    }
    const categoria = categorias.find((c) => c.slug === filtro);
    return folhas.filter((f) => f.categoriaId === categoria?.id);
  }, [folhas, filtro, categorias]);

  const medir = useCallback((evento: LayoutChangeEvent) => {
    const { width, height } = evento.nativeEvent.layout;
    setArea({ largura: Math.min(width - spacing.lg * 2, 540), altura: height });
  }, []);

  const abrir = useCallback(() => {
    if (reduzido) {
      setAberto(true);
      return;
    }
    abertura.set(withTiming(1, { duration: 750 }, (terminou) => {
      if (terminou) {
        scheduleOnRN(setAberto, true);
      }
    }));
  }, [abertura, reduzido]);

  // A capa gira para a esquerda, presa na lombada, até ficar de lado.
  const estiloCapa = useAnimatedStyle(() => ({
    transform: [{ perspective: 1400 }, { rotateY: `${-92 * abertura.value}deg` }],
  }));

  const renderFolha = useCallback(
    (folha: Folha, ativa: boolean) => {
      const categoria = categoriaPorId.get(folha.categoriaId);
      if (folha.tipo === 'esperando') {
        return <FolhaEsperandoView folha={folha} categoriaNome={categoria?.nome ?? null} />;
      }
      return (
        <FolhaMemoriaView
          folha={folha}
          categoriaSlug={categoria?.slug ?? null}
          categoriaNome={categoria?.nome ?? null}
          largura={area?.largura ?? 320}
          ativa={ativa && aberto}
        />
      );
    },
    [categoriaPorId, area?.largura, aberto],
  );

  const nomeDoFiltro = filtro ? (categorias.find((c) => c.slug === filtro)?.nome ?? null) : null;

  return (
    <Mesa>
      <View style={styles.cabecalho}>
        <View style={styles.marca}>
          <Text style={styles.logo} accessibilityRole="header">
            Me Conta
          </Text>
          <Text style={styles.status} accessibilityLiveRegion="polite">
            {sincronizando ? 'atualizando o caderno…' : online ? 'caderno em dia' : 'sem internet · guardado no celular'}
          </Text>
        </View>
        <BotaoDeCanto
          label="Família"
          icone="familia"
          onPress={() => router.push('/familia')}
          accessibilityHint="Abre os avós, o convite e o painel da família"
        />
      </View>

      <View style={styles.abas}>
        {aberto ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <AbasDeCategoria categorias={categorias} selecionada={filtro} onSelecionar={setFiltro} />
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.palco} onLayout={medir}>
        {area && !isLoading ? (
          <View>
            {/* A chave do filtro recria o caderno: trocar de aba volta para a primeira folha. */}
            <Caderno<Folha>
              key={filtro ?? 'tudo'}
              folhas={folhasFiltradas}
              chaveDaFolha={chaveDaFolha}
              renderFolha={renderFolha}
              vazio={<FolhaVazia categoriaNome={nomeDoFiltro} />}
              largura={area.largura}
              altura={area.altura}
              capa={
                aberto ? null : (
                  <Animated.View style={[StyleSheet.absoluteFill, styles.giroCapa, estiloCapa]}>
                    <Capa nomeDaFamilia={nomeDaFamilia} onAbrir={abrir} />
                  </Animated.View>
                )
              }
              acaoNoRodape={
                <BotaoDeCanto
                  label="Perguntar"
                  icone="pena"
                  destaque
                  onPress={() => router.push('/perguntar')}
                  accessibilityHint="Escolhe uma pergunta para mandar pelo WhatsApp"
                />
              }
            />
          </View>
        ) : (
          <ActivityIndicator color={colors.dourado} />
        )}
      </View>

    </Mesa>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  carregando: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.md,
    color: colors.papel,
  },
  cartao: {
    alignSelf: 'stretch',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
  },
  cartaoTitulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoXl,
    color: colors.tinta,
  },
  cartaoTexto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  marca: {
    flexShrink: 1,
  },
  logo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoMd + 4,
    color: colors.dourado,
  },
  status: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.papel,
  },
  abas: {
    minHeight: 64,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  palco: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: spacing.lg,
  },
  giroCapa: {
    transformOrigin: 'left center',
    backfaceVisibility: 'hidden',
  },
});
