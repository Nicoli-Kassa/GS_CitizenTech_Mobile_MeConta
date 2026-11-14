import React, { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import { useMovimentoReduzido } from '../../hooks/useMovimentoReduzido';
import { colors, fonts, fontSize, radius, spacing, toqueMinimo } from '../../theme/theme';
import { Icone } from '../Icone';
import { Papel } from '../Papel';
import { Argolas } from './Argolas';

type CadernoProps<T> = {
  folhas: readonly T[];
  chaveDaFolha: (folha: T) => string;
  /** Desenha o conteúdo de uma folha. `ativa` é a folha visível. */
  renderFolha: (folha: T, ativa: boolean) => ReactNode;
  /** Mostrado quando não há nenhuma folha. */
  vazio: ReactNode;
  largura: number;
  /** Altura total disponível: folha + rodapé com as setas. */
  altura: number;
  /** Botão principal da tela, na mesma linha das setas (à direita). */
  acaoNoRodape?: ReactNode;
  /** Capa por cima das folhas (antes de abrir). As argolas passam por ela também. */
  capa?: ReactNode;
};

/** Quanto a folha precisa ter virado para completar sozinha ao soltar. */
const LIMIAR = 0.35;
const VELOCIDADE_MINIMA = 650;
const DURACAO_MS = 420;

/**
 * Caderno de argolas que vira as folhas com o dedo ou com as setas.
 *
 * A folha gira em torno da margem esquerda (onde ficam as argolas). Para
 * avançar, a folha atual sai girando e revela a próxima. Para voltar, a
 * folha anterior volta girando por cima. Com "Reduzir movimento" ligado,
 * a troca vira um esmaecimento curto.
 */
export function Caderno<T>({
  folhas,
  chaveDaFolha,
  renderFolha,
  vazio,
  largura,
  altura,
  acaoNoRodape,
  capa,
}: CadernoProps<T>): React.JSX.Element {
  const [indiceGuardado, setIndice] = useState(0);
  // O rodapé pode quebrar em duas linhas (fonte grande); a folha encolhe para caber.
  const [alturaRodape, setAlturaRodape] = useState(80);
  const alturaFolha = Math.max(240, altura - alturaRodape);
  const reduzido = useMovimentoReduzido();

  const avanco = useSharedValue(0);
  const volta = useSharedValue(0);
  const total = useSharedValue(folhas.length);
  const atualSV = useSharedValue(0);

  const quantidade = folhas.length;
  // Se uma folha some (página apagada), o índice não passa do fim.
  const indice = Math.min(indiceGuardado, Math.max(0, quantidade - 1));
  const atual = folhas[indice];
  const proxima = folhas[indice + 1];
  const anterior = folhas[indice - 1];

  useEffect(() => {
    total.set(quantidade);
  }, [quantidade, total]);

  // Depois de trocar a folha, as duas animações voltam ao zero antes de desenhar.
  useLayoutEffect(() => {
    atualSV.set(indice);
    avanco.set(0);
    volta.set(0);
  }, [indice, atualSV, avanco, volta]);

  const anunciar = useCallback(
    (novo: number) => {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
      AccessibilityInfo.announceForAccessibility(`Página ${novo + 1} de ${quantidade}`);
    },
    [quantidade],
  );

  const concluirAvanco = useCallback(() => {
    setIndice((i) => {
      const novo = Math.min(i + 1, quantidade - 1);
      anunciar(novo);
      return novo;
    });
  }, [anunciar, quantidade]);

  const concluirVolta = useCallback(() => {
    setIndice((i) => {
      const novo = Math.max(i - 1, 0);
      anunciar(novo);
      return novo;
    });
  }, [anunciar]);

  const virarParaFrente = useCallback(() => {
    if (indice >= quantidade - 1) {
      return;
    }
    if (reduzido) {
      concluirAvanco();
      return;
    }
    avanco.set(withTiming(1, { duration: DURACAO_MS }, (terminou) => {
      if (terminou) {
        scheduleOnRN(concluirAvanco);
      }
    }));
  }, [avanco, concluirAvanco, indice, quantidade, reduzido]);

  const virarParaTras = useCallback(() => {
    if (indice <= 0) {
      return;
    }
    if (reduzido) {
      concluirVolta();
      return;
    }
    volta.set(withTiming(1, { duration: DURACAO_MS }, (terminou) => {
      if (terminou) {
        scheduleOnRN(concluirVolta);
      }
    }));
  }, [volta, concluirVolta, indice, reduzido]);

  const distancia = largura * 0.8;

  const gesto = usePanGesture({
    // Só ativa no arrasto para os lados: a rolagem vertical da folha continua funcionando.
    activeOffsetX: [-14, 14],
    failOffsetY: [-18, 18],
    onUpdate: (evento) => {
      'worklet';
      if (reduzido) {
        return;
      }
      const dx = evento.translationX;
      if (dx < 0 && atualSV.value < total.value - 1) {
        avanco.set(Math.min(1, -dx / distancia));
        volta.set(0);
      } else if (dx > 0 && atualSV.value > 0) {
        volta.set(Math.min(1, dx / distancia));
        avanco.set(0);
      }
    },
    onDeactivate: (evento) => {
      'worklet';
      if (reduzido) {
        if (evento.translationX < -60 && atualSV.value < total.value - 1) {
          scheduleOnRN(concluirAvanco);
        } else if (evento.translationX > 60 && atualSV.value > 0) {
          scheduleOnRN(concluirVolta);
        }
        return;
      }
      if (avanco.value > 0) {
        const completa = avanco.value > LIMIAR || evento.velocityX < -VELOCIDADE_MINIMA;
        avanco.set(withTiming(completa ? 1 : 0, { duration: DURACAO_MS * 0.6 }, (terminou) => {
          if (terminou && completa) {
            scheduleOnRN(concluirAvanco);
          }
        }));
      } else if (volta.value > 0) {
        const completa = volta.value > LIMIAR || evento.velocityX > VELOCIDADE_MINIMA;
        volta.set(withTiming(completa ? 1 : 0, { duration: DURACAO_MS * 0.6 }, (terminou) => {
          if (terminou && completa) {
            scheduleOnRN(concluirVolta);
          }
        }));
      }
    },
  });

  // Folha atual saindo: gira de 0° até 90° em torno da margem esquerda.
  const estiloAtual = useAnimatedStyle(() => ({
    transform: [{ perspective: 1600 }, { rotateY: `${-90 * avanco.value}deg` }],
  }));
  const sombraNaAtual = useAnimatedStyle(() => ({
    opacity: interpolate(avanco.value, [0, 1], [0, 0.45]),
  }));
  // Sombra que a folha virando projeta na próxima.
  const sombraNaProxima = useAnimatedStyle(() => ({
    opacity: avanco.value > 0 ? interpolate(avanco.value, [0, 1], [0.3, 0]) : 0,
  }));
  // Folha anterior voltando: começa em 90° (de lado, invisível) e deita em 0°.
  const estiloAnterior = useAnimatedStyle(() => ({
    opacity: volta.value > 0 ? 1 : 0,
    transform: [{ perspective: 1600 }, { rotateY: `${-90 * (1 - volta.value)}deg` }],
  }));
  const sombraNaAnterior = useAnimatedStyle(() => ({
    opacity: interpolate(volta.value, [0, 1], [0.45, 0]),
  }));
  const sombraSobAtual = useAnimatedStyle(() => ({
    opacity: volta.value > 0 ? interpolate(volta.value, [0, 1], [0, 0.3]) : 0,
  }));

  const folhaFisica = (conteudo: ReactNode): React.JSX.Element => (
    <Papel style={styles.folha}>{conteudo}</Papel>
  );

  return (
    <View style={{ width: largura }}>
      <View style={[styles.livro, { width: largura - 12, height: alturaFolha }]}>
        {/* Espessura do bloco de folhas, à direita e embaixo. */}
        <View style={[styles.espessura, styles.espessura2]} />
        <View style={[styles.espessura, styles.espessura1]} />

        <GestureDetector gesture={gesto}>
          <View style={StyleSheet.absoluteFill}>
            {quantidade === 0 ? (
              folhaFisica(vazio)
            ) : (
              <>
                {proxima ? (
                  <View style={StyleSheet.absoluteFill} key={`p-${chaveDaFolha(proxima)}`}>
                    {folhaFisica(renderFolha(proxima, false))}
                    <Animated.View pointerEvents="none" style={[styles.sombra, sombraNaProxima]} />
                  </View>
                ) : null}

                {atual ? (
                  <Animated.View
                    key={`a-${chaveDaFolha(atual)}`}
                    entering={reduzido ? FadeIn.duration(180) : undefined}
                    style={[StyleSheet.absoluteFill, styles.giro, estiloAtual]}>
                    {folhaFisica(renderFolha(atual, true))}
                    <Animated.View pointerEvents="none" style={[styles.sombra, sombraNaAtual]} />
                    <Animated.View pointerEvents="none" style={[styles.sombra, sombraSobAtual]} />
                  </Animated.View>
                ) : null}

                {anterior && !reduzido ? (
                  <Animated.View
                    key={`v-${chaveDaFolha(anterior)}`}
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFill, styles.giro, estiloAnterior]}>
                    {folhaFisica(renderFolha(anterior, false))}
                    <Animated.View pointerEvents="none" style={[styles.sombra, sombraNaAnterior]} />
                  </Animated.View>
                ) : null}
              </>
            )}
          </View>
        </GestureDetector>

        {capa}
        <Argolas altura={alturaFolha} />
      </View>

      <View style={styles.rodape} onLayout={(e) => setAlturaRodape(e.nativeEvent.layout.height + spacing.lg)}>
        {quantidade > 0 ? (
          <View style={styles.paginacao}>
            <SetaDePagina direcao="anterior" desativada={indice === 0} onPress={virarParaTras} />
            <Text style={styles.numero} accessibilityLiveRegion="polite" accessibilityLabel={`Página ${indice + 1} de ${quantidade}`}>
              {indice + 1} de {quantidade}
            </Text>
            <SetaDePagina direcao="proxima" desativada={indice >= quantidade - 1} onPress={virarParaFrente} />
          </View>
        ) : (
          <View />
        )}
        {acaoNoRodape}
      </View>
    </View>
  );
}

type SetaDePaginaProps = {
  direcao: 'anterior' | 'proxima';
  desativada: boolean;
  onPress: () => void;
};

/** Alternativa ao gesto: as setas fazem a mesma animação e funcionam com leitor de tela. */
function SetaDePagina({ direcao, desativada, onPress }: SetaDePaginaProps): React.JSX.Element {
  const rotulo = direcao === 'anterior' ? 'Página anterior' : 'Próxima página';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desativada }}
      disabled={desativada}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.seta, desativada ? styles.setaDesativada : null, pressed ? styles.setaPressionada : null]}>
      <Icone nome={direcao} cor={colors.creme} tamanho={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  livro: {
    marginLeft: 12,
  },
  espessura: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.papelEscuro,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B89C70',
  },
  espessura1: {
    transform: [{ translateX: 4 }, { translateY: 3 }],
  },
  espessura2: {
    transform: [{ translateX: 8 }, { translateY: 6 }],
    backgroundColor: '#D8C39A',
  },
  folha: {
    flex: 1,
    borderRadius: radius.sm,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  giro: {
    transformOrigin: 'left center',
    backfaceVisibility: 'hidden',
  },
  sombra: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.sombra,
    borderRadius: radius.sm,
  },
  rodape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  paginacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  numero: {
    minWidth: 52,
    textAlign: 'center',
    fontFamily: fonts.maquina,
    fontSize: fontSize.md,
    color: colors.papel,
  },
  seta: {
    width: toqueMinimo,
    height: toqueMinimo,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.dourado,
    backgroundColor: colors.capaEscura,
  },
  setaDesativada: {
    opacity: 0.35,
  },
  setaPressionada: {
    transform: [{ scale: 0.94 }],
  },
});
