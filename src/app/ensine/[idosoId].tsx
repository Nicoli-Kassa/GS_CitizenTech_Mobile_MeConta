import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Botao } from '../../components/Botao';
import { Folha } from '../../components/Folha';
import { Recado } from '../../components/Recado';
import { useSessao } from '../../contexts/SessaoContext';
import { useMovimentoReduzido } from '../../hooks/useMovimentoReduzido';
import { api } from '../../services/api';
import { listarIdosos } from '../../services/banco/repositorios';
import type { Idoso } from '../../types/api';
import { colors, fonts, fontSize, radius, spacing } from '../../theme/theme';
import { describeError } from '../../utils/errors';

type Passo = { titulo: string; texto: string; dica: string; desenho: 'abrir' | 'conversa' | 'segurar' | 'soltar' };

const PASSOS: readonly Passo[] = [
  {
    titulo: 'Abrir o WhatsApp',
    texto: 'Mostre o ícone verde na tela e peça para tocar uma vez nele.',
    dica: 'Se o ícone estiver escondido, deixe-o na primeira tela do celular.',
    desenho: 'abrir',
  },
  {
    titulo: 'Achar a conversa',
    texto: 'Mostre onde está a sua conversa (ou a da família) e peça para tocar nela.',
    dica: 'Fixe a conversa no topo: ela fica sempre em primeiro lugar.',
    desenho: 'conversa',
  },
  {
    titulo: 'Segurar o microfone',
    texto: 'Embaixo, à direita, tem um microfone. Segure o dedo nele e fale a resposta.',
    dica: 'É só segurar, como um botão de campainha. Não precisa digitar nada.',
    desenho: 'segurar',
  },
  {
    titulo: 'Soltar para enviar',
    texto: 'Quando terminar de falar, é só soltar o dedo. O áudio vai sozinho.',
    dica: 'Se soltar antes, não tem problema: dá para mandar outro áudio.',
    desenho: 'soltar',
  },
];

/**
 * Modo "Ensine sua avó" (US14): roteiro de 4 passos para o neto ensinar a
 * pessoa idosa a responder por áudio. "Ainda não" sugere repetir o passo;
 * com todos concluídos, ela passa a contar como "Responde sozinho".
 */
export default function EnsineScreen(): React.JSX.Element {
  const { idosoId } = useLocalSearchParams<{ idosoId: string }>();
  const { familia, sincronizarAgora } = useSessao();
  const reduzido = useMovimentoReduzido();
  const [idoso, setIdoso] = useState<Idoso | null>(null);
  const [passo, setPasso] = useState(0);
  const [aindaNao, setAindaNao] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (familia) {
      void listarIdosos(familia.id).then((lista) => setIdoso(lista.find((i) => i.id === Number(idosoId)) ?? null));
    }
  }, [familia, idosoId]);

  const apelido = idoso?.apelido ?? 'a avó';
  const atual = PASSOS[passo];

  const conseguiu = async (): Promise<void> => {
    setAindaNao(false);
    if (passo < PASSOS.length - 1) {
      setPasso(passo + 1);
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await api.concluirRoteiro(Number(idosoId));
      await sincronizarAgora();
      setConcluido(true);
    } catch (falha) {
      setErro(describeError(falha, 'Não foi possível salvar agora. Tente de novo com internet.'));
    } finally {
      setSalvando(false);
    }
  };

  if (concluido) {
    return (
      <Folha titulo="Conseguiu!" sobretitulo="Ensine sua avó" voltar="Voltar">
        <Text style={styles.grande}>Agora {apelido} já responde pelo WhatsApp sem ajuda.</Text>
        <Text style={styles.texto}>Mande a primeira pergunta para comemorar. A resposta vai direto para o caderno da família.</Text>
        <Botao label="Fazer uma pergunta" icone="pena" onPress={() => router.replace('/perguntar')} />
        <Botao label="Voltar para a família" variante="contorno" onPress={() => router.back()} />
      </Folha>
    );
  }

  return (
    <Folha titulo={`Ensine ${apelido}`} sobretitulo={`passo ${passo + 1} de ${PASSOS.length}`} voltar="Sair do roteiro">
      <View style={styles.pontos} accessible accessibilityLabel={`Passo ${passo + 1} de ${PASSOS.length}`}>
        {PASSOS.map((p, i) => (
          <View key={p.titulo} style={[styles.ponto, i <= passo ? styles.pontoFeito : null]} />
        ))}
      </View>

      {atual ? (
        <Animated.View key={passo} entering={reduzido ? undefined : FadeIn.duration(350)} exiting={reduzido ? undefined : FadeOut.duration(150)} style={styles.cartao}>
          <View style={styles.desenho} aria-hidden>
            <DesenhoDoPasso tipo={atual.desenho} />
          </View>
          <Text style={styles.titulo} accessibilityRole="header">
            {passo + 1}. {atual.titulo}
          </Text>
          <Text style={styles.texto}>{atual.texto}</Text>
          {aindaNao ? <Recado tipo="aviso" titulo="Tudo bem, sem pressa." texto={`Repitam este passo com calma. ${atual.dica}`} /> : null}
        </Animated.View>
      ) : null}

      {erro ? <Recado tipo="erro" texto={erro} /> : null}
      <Botao label={`${apelido} conseguiu`} icone="proxima" isLoading={salvando} onPress={() => void conseguiu()} />
      <Botao label="Ainda não" variante="contorno" onPress={() => setAindaNao(true)} />
    </Folha>
  );
}

/** Celular desenhado a traço, com o detalhe de cada passo. Sem marcas nem logos. */
function DesenhoDoPasso({ tipo }: { tipo: Passo['desenho'] }): React.JSX.Element {
  const traco = { stroke: colors.tinta, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={170} height={200} viewBox="0 0 170 200">
      <Rect x={45} y={10} width={80} height={160} rx={12} {...traco} />
      <Path d="M75 20 L95 20" {...traco} />
      {tipo === 'abrir' ? (
        <>
          <Rect x={55} y={40} width={18} height={18} rx={4} {...traco} />
          <Rect x={76} y={40} width={18} height={18} rx={4} {...traco} />
          <Rect x={97} y={40} width={18} height={18} rx={4} {...traco} />
          <Circle cx={64} cy={78} r={10} fill="#4E8A3E" />
          <Path d="M59 79 C 61 84, 67 84, 69 79" stroke={colors.creme} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M64 120 L64 96 M58 102 L64 96 L70 102" {...traco} />
        </>
      ) : null}
      {tipo === 'conversa' ? (
        <>
          {[40, 66, 92, 118].map((y, i) => (
            <React.Fragment key={y}>
              <Circle cx={60} cy={y + 8} r={7} {...traco} fill={i === 0 ? '#E0B04A' : 'none'} />
              <Path d={`M72 ${y + 4} L112 ${y + 4} M72 ${y + 12} L100 ${y + 12}`} {...traco} />
            </React.Fragment>
          ))}
          <Path d="M130 52 C 140 48, 146 44, 150 36 M118 48 L130 52 L126 40" {...traco} />
        </>
      ) : null}
      {tipo === 'segurar' || tipo === 'soltar' ? (
        <>
          <Rect x={55} y={40} width={50} height={18} rx={8} {...traco} />
          <Rect x={65} y={66} width={50} height={18} rx={8} {...traco} fill="#E8F3DD" />
          <Rect x={52} y={146} width={46} height={14} rx={7} {...traco} />
          <Circle cx={110} cy={153} r={9} fill={tipo === 'segurar' ? '#4E8A3E' : 'none'} {...(tipo === 'soltar' ? traco : {})} />
          <Path d="M110 148 L110 156 M106 154 C 106 159, 114 159, 114 154" stroke={tipo === 'segurar' ? colors.creme : colors.tinta} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          {tipo === 'segurar' ? (
            <Path d="M128 160 C 140 168, 150 172, 160 186 M122 150 C 134 148, 140 156, 140 166" {...traco} />
          ) : (
            <Path d="M135 130 C 145 120, 150 112, 152 100 M128 122 L135 130 L143 124 M70 100 L100 100" {...traco} />
          )}
        </>
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  pontos: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  ponto: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pauta,
  },
  pontoFeito: {
    backgroundColor: colors.tinta,
  },
  cartao: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: '#FFFDF6',
    shadowColor: colors.sombra,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  desenho: {
    alignItems: 'center',
  },
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    color: colors.tinta,
  },
  grande: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    lineHeight: fontSize.manuscritoLg * 1.15,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * 1.45,
    color: colors.tinta,
  },
});
