import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Fita } from '../components/Enfeites';
import { Escolha } from '../components/Escolha';
import { Folha, Secao } from '../components/Folha';
import { Icone } from '../components/Icone';
import { Recado } from '../components/Recado';
import { useSessao } from '../contexts/SessaoContext';
import { useCaderno } from '../hooks/useCaderno';
import { useMovimentoReduzido } from '../hooks/useMovimentoReduzido';
import { usePerguntas } from '../hooks/usePerguntas';
import { api } from '../services/api';
import { inserirEnvioPendente, salvarPerguntas } from '../services/banco/repositorios';
import { avisarMudanca } from '../services/eventos';
import type { Idoso, Pergunta } from '../types/api';
import { categoriaCores, colors, corPadraoCategoria, fonts, fontSize, radius, spacing, toqueMinimo } from '../theme/theme';
import { describeError } from '../utils/errors';
import {
  hojeEmSaoPaulo,
  MENSAGENS,
  montarLinkWhatsApp,
  montarMensagem,
  semanaContendo,
  sugerirPergunta,
  validarPerguntaPropria,
} from '../utils/regras';

type Etapa = 'escolhendo' | 'sem-whatsapp' | 'enviada';

/**
 * Perguntar (US04 a US07): a pergunta da semana num bilhete, as perguntas por
 * assunto, a pergunta escrita pela família e o envio pelo WhatsApp.
 *
 * O envio só é registrado depois que o WhatsApp abre: sem WhatsApp no celular,
 * a pergunta não fica marcada como enviada (US07).
 */
export default function PerguntarScreen(): React.JSX.Element {
  const { familia, sincronizarAgora } = useSessao();
  const { idosos, categorias } = useCaderno(familia?.id ?? null);
  const reduzido = useMovimentoReduzido();

  const [idosoEscolhido, setIdosoEscolhido] = useState<number | null>(null);
  const idoso: Idoso | undefined =
    idosos.find((i) => i.id === idosoEscolhido) ?? idosos.find((i) => i.whatsApp) ?? idosos[0];
  const { perguntas } = usePerguntas(idoso?.id ?? null);

  const [escolhida, setEscolhida] = useState<Pergunta | null>(null);
  const [assunto, setAssunto] = useState<number | null>(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [textoProprio, setTextoProprio] = useState('');
  const [categoriaPropria, setCategoriaPropria] = useState<number | null>(null);
  const [erroProprio, setErroProprio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('escolhendo');
  const [erro, setErro] = useState<string | null>(null);

  const voo = useSharedValue(0);

  const semana = semanaContendo(hojeEmSaoPaulo());
  const jaEnviadas = useMemo(() => new Set(perguntas.filter((p) => p.jaPerguntada).map((p) => p.id)), [perguntas]);
  const sugestao = useMemo(
    () => (idoso ? sugerirPergunta(idoso.id, perguntas, jaEnviadas, semana.numero) : null),
    [idoso, perguntas, jaEnviadas, semana.numero],
  );
  const pergunta = escolhida && perguntas.some((p) => p.id === escolhida.id) ? escolhida : sugestao;
  const ehDaSemana = pergunta !== null && pergunta.id === sugestao?.id;
  const mensagem = idoso && pergunta ? montarMensagem(idoso.apelido, pergunta.texto) : '';

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const daCategoria = perguntas.filter((p) => assunto === null || p.categoriaId === assunto);

  const outraPergunta = (): void => {
    const candidatas = perguntas.filter((p) => !p.jaPerguntada && p.id !== pergunta?.id);
    const sorteada = candidatas[Math.floor(Math.random() * candidatas.length)];
    if (sorteada) {
      setEscolhida(sorteada);
    }
  };

  const salvarPropria = async (): Promise<void> => {
    if (!familia) {
      return;
    }
    setErroProprio(null);
    setSalvando(true);
    try {
      const texto = validarPerguntaPropria(textoProprio, categoriaPropria);
      const criada = await api.criarPergunta(familia.id, texto, categoriaPropria ?? 0);
      await salvarPerguntas([criada]);
      avisarMudanca();
      setEscolhida(criada);
      setEscrevendo(false);
      setTextoProprio('');
    } catch (falha) {
      setErroProprio(describeError(falha, 'Não foi possível salvar. Escrever perguntas precisa de internet.'));
    } finally {
      setSalvando(false);
    }
  };

  /** Registra o envio no celular; a sincronização leva para a API (ou guarda até a internet voltar). */
  const registrarEnvio = async (): Promise<void> => {
    if (!idoso?.whatsApp || !pergunta) {
      return;
    }
    await inserirEnvioPendente({
      idosoId: idoso.id,
      perguntaId: pergunta.id,
      pergunta: pergunta.texto,
      categoriaId: pergunta.categoriaId,
      mensagem,
      linkWhatsApp: montarLinkWhatsApp(idoso.whatsApp, mensagem),
      enviadoEm: new Date().toISOString(),
    });
    avisarMudanca();
    setEtapa('enviada');
    void sincronizarAgora();
  };

  const abrirWhatsApp = async (): Promise<void> => {
    if (!idoso?.whatsApp || !pergunta) {
      return;
    }
    setErro(null);
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(montarLinkWhatsApp(idoso.whatsApp, mensagem));
      } else {
        // Abre direto o aplicativo; se ele não existir, o sistema recusa e o app oferece copiar.
        await Linking.openURL(`whatsapp://send?phone=${idoso.whatsApp}&text=${encodeURIComponent(mensagem)}`);
      }
      await registrarEnvio();
    } catch {
      setEtapa('sem-whatsapp');
    } finally {
      voo.set(0);
    }
  };

  /**
   * Chamada no fim da animação. Precisa ser criada aqui, no JavaScript do app:
   * uma função criada dentro da animação (que roda na linha de interface)
   * derruba o app no celular ao ser chamada de volta.
   */
  const abrirDepoisDoVoo = (): void => {
    void abrirWhatsApp();
  };

  const enviar = (): void => {
    if (reduzido) {
      void abrirWhatsApp();
      return;
    }
    // O bilhete dobra e sobe como um envelope antes de abrir o WhatsApp.
    voo.set(
      withTiming(1, { duration: 650 }, (terminou) => {
        if (terminou) {
          scheduleOnRN(abrirDepoisDoVoo);
        }
      }),
    );
  };

  const estiloBilhete = useAnimatedStyle(() => ({
    opacity: 1 - voo.value * 0.9,
    transform: [{ translateY: -90 * voo.value }, { scale: 1 - 0.55 * voo.value }, { rotate: `${-2 + 10 * voo.value}deg` }],
  }));
  const estiloEnvelope = useAnimatedStyle(() => ({
    opacity: voo.value,
    transform: [{ translateY: -60 * voo.value }, { scale: 0.6 + 0.6 * voo.value }],
  }));

  if (!familia || idosos.length === 0) {
    return (
      <Folha titulo="Perguntar">
        <Recado texto="Cadastre a avó ou o avô primeiro. Depois é só escolher a pergunta." titulo="Para quem é a pergunta?" />
        <Botao label="Cadastrar agora" onPress={() => router.replace('/familia')} />
      </Folha>
    );
  }

  if (etapa === 'enviada' && idoso) {
    return (
      <Folha titulo="Pergunta enviada!" sobretitulo={`para ${idoso.apelido}`} voltar="Voltar ao caderno">
        <Animated.View entering={reduzido ? undefined : FadeIn.duration(400)} style={styles.envelopeGrande} aria-hidden>
          <Icone nome="envelope" tamanho={96} cor={colors.capa} />
        </Animated.View>
        <Text style={styles.texto}>
          Uma página em branco ficou esperando no caderno. Quando {idoso.apelido} mandar o áudio, guarde ali a resposta.
        </Text>
        <Botao label="Voltar ao caderno" icone="anterior" onPress={() => router.back()} />
        <Botao
          label="Fazer outra pergunta"
          variante="contorno"
          onPress={() => {
            setEscolhida(null);
            setEtapa('escolhendo');
          }}
        />
      </Folha>
    );
  }

  const semWhatsAppDoIdoso = !idoso?.whatsApp;

  return (
    <Folha
      titulo="Perguntar"
      sobretitulo={`semana de ${semana.inicio.split('-').reverse().slice(0, 2).join('/')} a ${semana.fim.split('-').reverse().slice(0, 2).join('/')}`}
      textura="kraft"
      rodape={
        <Botao
          label="Enviar pelo WhatsApp"
          icone="envelope"
          disabled={!pergunta || semWhatsAppDoIdoso}
          helperText={semWhatsAppDoIdoso ? MENSAGENS.semWhatsApp : null}
          onPress={enviar}
          accessibilityHint={idoso ? `Abre a conversa com ${idoso.apelido} com a pergunta escrita` : undefined}
        />
      }>
      <Escolha<number>
        label="Para quem é a pergunta?"
        valor={idoso?.id ?? null}
        onChange={(id) => {
          setIdosoEscolhido(id);
          setEscolhida(null);
          setEtapa('escolhendo');
        }}
        opcoes={idosos.map((i) => ({ valor: i.id, rotulo: i.apelido, dica: i.whatsApp ? undefined : 'sem WhatsApp' }))}
      />

      {semWhatsAppDoIdoso && idoso ? (
        <View style={styles.coluna}>
          <Recado tipo="aviso" titulo={MENSAGENS.semWhatsApp} texto={`${idoso.apelido} ainda não tem WhatsApp no cadastro.`} />
          <Botao label="Ir para a família" variante="contorno" onPress={() => router.replace('/familia')} />
        </View>
      ) : null}

      {etapa === 'sem-whatsapp' ? (
        <View style={styles.coluna}>
          <Recado
            tipo="aviso"
            titulo="Não encontramos o WhatsApp"
            texto="Copie a pergunta e mande do jeito que preferir. Ela só fica marcada como enviada quando o WhatsApp abrir."
          />
          <Botao
            label="Copiar a pergunta"
            variante="papel"
            onPress={() => {
              void Clipboard.setStringAsync(mensagem);
              setErro('Pergunta copiada. É só colar na conversa.');
            }}
          />
          <Botao
            label="Abrir pelo link do WhatsApp"
            variante="contorno"
            onPress={() => {
              if (idoso?.whatsApp) {
                Linking.openURL(montarLinkWhatsApp(idoso.whatsApp, mensagem))
                  .then(() => registrarEnvio())
                  .catch(() => setErro('O link também não abriu. Use “Copiar a pergunta”.'));
              }
            }}
          />
        </View>
      ) : null}
      {erro ? <Recado tipo="info" texto={erro} /> : null}

      {pergunta ? (
        <View style={styles.palcoDoBilhete}>
          <Animated.View style={[styles.bilhete, estiloBilhete]} key={pergunta.id} entering={reduzido ? undefined : FadeIn.duration(350)}>
            <Fita style={styles.fita} largura={88} rotacao={-5} />
            <Text style={styles.rotulo}>{ehDaSemana ? 'Pergunta da semana' : (categoriaPorId.get(pergunta.categoriaId)?.nome ?? 'Pergunta')}</Text>
            <Text style={styles.pergunta} accessibilityRole="header">
              {pergunta.texto}
            </Text>
            {pergunta.jaPerguntada ? <Text style={styles.jaPerguntada}>Já perguntada</Text> : null}
          </Animated.View>
          <Animated.View style={[styles.envelopeVoando, estiloEnvelope]} pointerEvents="none" aria-hidden>
            <Icone nome="envelope" tamanho={72} cor={colors.capa} />
          </Animated.View>
        </View>
      ) : (
        <View style={styles.coluna}>
          <Recado titulo="Todas as perguntas já foram feitas" texto="Escreva uma pergunta sua: só a sua família sabe o que perguntar." />
          <Botao label="Escreva uma pergunta sua" icone="pena" onPress={() => setEscrevendo(true)} />
        </View>
      )}

      {pergunta ? (
        <View style={styles.coluna}>
          <Botao label="Outra pergunta" variante="papel" onPress={outraPergunta} accessibilityHint="Sorteia uma pergunta que ainda não foi feita" />
          <View style={styles.previa} accessible accessibilityLabel={`Vai chegar assim no WhatsApp: ${mensagem}`}>
            <Text style={styles.rotulo}>Vai chegar assim no WhatsApp:</Text>
            <View style={styles.balao}>
              <Text style={styles.textoBalao}>{mensagem}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <Secao titulo="Ou escolha por assunto">
        <Escolha<number>
          label="Assunto"
          valor={assunto ?? -1}
          onChange={(valor) => setAssunto(valor === -1 ? null : valor)}
          opcoes={[
            { valor: -1, rotulo: 'Todos' },
            ...categorias.map((c) => ({
              valor: c.id,
              rotulo: c.nome,
              fundo: (categoriaCores[c.slug] ?? corPadraoCategoria).fundo,
              texto: (categoriaCores[c.slug] ?? corPadraoCategoria).texto,
            })),
          ]}
        />
        <View style={styles.lista}>
          {daCategoria.map((p) => {
            const ativa = p.id === pergunta?.id;
            const cor = categoriaCores[categoriaPorId.get(p.categoriaId)?.slug ?? ''] ?? corPadraoCategoria;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.texto}${p.jaPerguntada ? ', já perguntada' : ''}${p.tipo === 'DaFamilia' ? ', pergunta da família' : ''}`}
                accessibilityState={{ selected: ativa }}
                onPress={() => setEscolhida(p)}
                style={({ pressed }) => [styles.item, { borderLeftColor: cor.fundo }, ativa ? styles.itemAtivo : null, pressed ? styles.itemPressionado : null]}>
                <Text style={[styles.itemTexto, p.jaPerguntada ? styles.itemFeito : null]}>{p.texto}</Text>
                <View style={styles.marcas}>
                  {p.jaPerguntada ? <Text style={styles.marca}>Já perguntada</Text> : null}
                  {p.tipo === 'DaFamilia' ? <Text style={styles.marca}>Da família</Text> : null}
                  {ativa ? <Text style={styles.marca}>Escolhida</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Secao>

      <Secao titulo="Escrever a minha">
        {escrevendo ? (
          <View style={styles.coluna}>
            <Campo
              label="A sua pergunta"
              value={textoProprio}
              onChangeText={(t) => {
                setErroProprio(null);
                setTextoProprio(t);
              }}
              multiline
              maxLength={220}
              placeholder="Ex.: Vó, como era o nome do cachorro da fazenda?"
              dica={`${textoProprio.trim().length} de 200 caracteres. Só a sua família vê.`}
              erro={erroProprio}
            />
            <Escolha<number>
              label="Assunto da pergunta"
              valor={categoriaPropria}
              onChange={setCategoriaPropria}
              opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            />
            <Botao label="Salvar a pergunta" icone="pena" isLoading={salvando} onPress={() => void salvarPropria()} />
          </View>
        ) : (
          <Botao label="Escrever uma pergunta" variante="contorno" icone="pena" onPress={() => setEscrevendo(true)} />
        )}
      </Secao>
    </Folha>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: spacing.md,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  envelopeGrande: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  palcoDoBilhete: {
    paddingTop: spacing.md,
  },
  bilhete: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: '#FFFDF6',
    borderRadius: 2,
    shadowColor: colors.sombra,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
  },
  fita: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
  },
  envelopeVoando: {
    position: 'absolute',
    alignSelf: 'center',
    top: spacing.xl,
  },
  rotulo: {
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
  jaPerguntada: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.erro,
  },
  previa: {
    gap: spacing.xs,
  },
  balao: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderTopLeftRadius: 2,
    backgroundColor: '#E8F3DD',
    borderWidth: 1,
    borderColor: '#B9CFA6',
  },
  textoBalao: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.4,
    color: colors.tinta,
  },
  lista: {
    gap: spacing.sm,
  },
  item: {
    minHeight: toqueMinimo + 8,
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,253,246,0.85)',
    borderLeftWidth: 6,
    borderRadius: radius.sm,
  },
  itemAtivo: {
    borderWidth: 2,
    borderColor: colors.tinta,
  },
  itemPressionado: {
    opacity: 0.75,
  },
  itemTexto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.35,
    color: colors.tinta,
  },
  itemFeito: {
    color: colors.tintaSuave,
  },
  marcas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  marca: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm - 1,
    color: colors.tintaSuave,
  },
});
