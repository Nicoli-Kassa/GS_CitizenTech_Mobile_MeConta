import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { Botao } from '../../components/Botao';
import { Campo } from '../../components/Campo';
import { Cantoneira, Fita } from '../../components/Enfeites';
import { Folha, Secao } from '../../components/Folha';
import { PlayerDeAudio } from '../../components/PlayerDeAudio';
import { Recado } from '../../components/Recado';
import { useSessao } from '../../contexts/SessaoContext';
import { listarIdosos, inserirPaginaLocal, obterEnvio, type EnvioLocal } from '../../services/banco/repositorios';
import { avisarMudanca } from '../../services/eventos';
import { colors, fonts, fontSize, spacing } from '../../theme/theme';
import { describeError } from '../../utils/errors';
import { extensaoDe, guardarNoApp, medirDuracao, validarAudio } from '../../utils/arquivos';
import { formatarData, formatarDuracao } from '../../utils/regras';

type AudioEscolhido = { uri: string; nome: string; segundos: number; estimada: boolean };

/** Identificador único da página (chave de idempotência): o reenvio offline nunca duplica. */
function novaChave(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });
}

/**
 * Guardar a resposta (US08 e US10): o áudio que a pessoa idosa mandou no
 * WhatsApp vira uma página do caderno, com título, foto opcional e o que ela
 * contou. Tudo é salvo primeiro no celular e sobe para a API quando dá.
 */
export default function RespostaScreen(): React.JSX.Element {
  const { envioId } = useLocalSearchParams<{ envioId: string }>();
  const { familia, membro, sincronizarAgora } = useSessao();
  const [envio, setEnvio] = useState<EnvioLocal | null>(null);
  const [apelido, setApelido] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [audio, setAudio] = useState<AudioEscolhido | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [transcricao, setTranscricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [lendoAudio, setLendoAudio] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const encontrado = await obterEnvio(Number(envioId));
      const idosos = familia ? await listarIdosos(familia.id) : [];
      if (ativo) {
        setEnvio(encontrado);
        setApelido(idosos.find((i) => i.id === encontrado?.idosoId)?.apelido ?? '');
        setCarregando(false);
      }
    })().catch(() => setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [envioId, familia]);

  const escolherAudio = async (): Promise<void> => {
    setErro(null);
    // Qualquer arquivo: a conferência do formato é nossa, para avisar com a mensagem certa (US08).
    const resultado = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    const arquivo = resultado.assets?.[0];
    if (resultado.canceled || !arquivo) {
      return;
    }
    try {
      validarAudio(arquivo.name, arquivo.size);
      setLendoAudio(true);
      const duracao = await medirDuracao(arquivo.uri, arquivo.size);
      setAudio({ uri: arquivo.uri, nome: arquivo.name, ...duracao });
    } catch (falha) {
      setAudio(null);
      setErro(describeError(falha));
    } finally {
      setLendoAudio(false);
    }
  };

  const escolherFoto = async (camera: boolean): Promise<void> => {
    setErro(null);
    if (camera) {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) {
        setErro('Sem permissão para a câmera. Escolha uma foto da galeria.');
        return;
      }
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] };
    const resultado = camera ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
    const imagem = resultado.assets?.[0];
    if (!resultado.canceled && imagem) {
      setFoto(imagem.uri);
    }
  };

  const guardar = async (): Promise<void> => {
    if (!envio || !audio || !membro) {
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const chave = novaChave();
      const extensaoDoAudio = extensaoDe(audio.nome) || 'm4a';
      const audioLocal = guardarNoApp(audio.uri, `resposta-${chave}.${extensaoDoAudio}`);
      const fotoLocal = foto ? guardarNoApp(foto, `foto-${chave}.${extensaoDe(foto) || 'jpg'}`) : null;
      await inserirPaginaLocal({
        chave,
        envio,
        idosoApelido: apelido,
        // Título em branco: a página usa o texto da pergunta (US08).
        titulo: titulo.trim() || envio.pergunta,
        transcricao: transcricao.trim() || null,
        duracaoSegundos: audio.segundos,
        audioLocal,
        audioNome: `resposta.${extensaoDoAudio}`,
        fotoLocal,
        criadaPorMembroId: membro.id,
      });
      avisarMudanca();
      void sincronizarAgora();
      router.back();
    } catch (falha) {
      setErro(describeError(falha, 'Não foi possível guardar a página. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <Folha titulo="Guardar a resposta">
        <Text style={styles.texto}>Abrindo a página…</Text>
      </Folha>
    );
  }

  if (!envio) {
    return (
      <Folha titulo="Guardar a resposta">
        <Recado tipo="erro" texto="Não encontramos essa pergunta no caderno. Volte e tente de novo." />
      </Folha>
    );
  }

  if (envio.status === 'Respondida') {
    return (
      <Folha titulo="Guardar a resposta">
        <Recado tipo="info" texto="Essa pergunta já foi respondida. A página está no caderno." />
        <Botao label="Voltar ao caderno" onPress={() => router.back()} />
      </Folha>
    );
  }

  return (
    <Folha
      titulo="Guardar a resposta"
      sobretitulo={`de ${apelido}, pergunta de ${formatarData(envio.enviadoEm)}`}
      rodape={
        <Botao
          label="Colar no caderno"
          icone="pena"
          isLoading={salvando}
          disabled={!audio}
          helperText={audio ? null : 'Escolha o áudio da resposta para continuar.'}
          onPress={() => void guardar()}
        />
      }>
      <View style={styles.bilhete}>
        <Fita style={styles.fita} largura={70} />
        <Text style={styles.rotulo}>A pergunta</Text>
        <Text style={styles.pergunta}>{envio.pergunta}</Text>
      </View>

      <Secao titulo="1. O áudio">
        <Text style={styles.texto}>
          No WhatsApp, segure o áudio de {apelido || 'quem respondeu'}, toque em compartilhar e salve no celular. Depois escolha aqui.
        </Text>
        <Botao label={audio ? 'Trocar o áudio' : 'Escolher o áudio'} variante={audio ? 'contorno' : 'tinta'} isLoading={lendoAudio} onPress={() => void escolherAudio()} />
        {audio ? (
          <View style={styles.coluna}>
            <Text style={styles.arquivo}>
              {audio.nome} · {formatarDuracao(audio.segundos)}
              {audio.estimada ? ' (aproximado)' : ''}
            </Text>
            <PlayerDeAudio fonte={audio.uri} apelido={apelido} duracaoSegundos={audio.segundos} />
          </View>
        ) : null}
        <Text style={styles.dica}>Aceita mp3, m4a, ogg ou opus (o formato do WhatsApp), até 20 MB.</Text>
      </Secao>

      <Secao titulo="2. Uma foto (se quiser)">
        {foto ? (
          <View style={styles.foto}>
            <Image source={{ uri: foto }} style={styles.imagem} contentFit="cover" accessibilityLabel="Foto escolhida para a página" />
            <Cantoneira posicao="superiorEsquerda" />
            <Cantoneira posicao="superiorDireita" />
            <Cantoneira posicao="inferiorEsquerda" />
            <Cantoneira posicao="inferiorDireita" />
          </View>
        ) : null}
        <View style={styles.linha}>
          <View style={styles.metade}>
            <Botao label="Da galeria" variante="contorno" onPress={() => void escolherFoto(false)} />
          </View>
          <View style={styles.metade}>
            <Botao label="Tirar foto" variante="contorno" onPress={() => void escolherFoto(true)} />
          </View>
        </View>
        {foto ? <Botao label="Tirar a foto da página" variante="papel" onPress={() => setFoto(null)} /> : null}
      </Secao>

      <Secao titulo="3. O título">
        <Campo
          label="Título da página"
          value={titulo}
          onChangeText={setTitulo}
          placeholder={envio.pergunta}
          maxLength={120}
          dica="Se ficar em branco, o título é a própria pergunta."
        />
      </Secao>

      <Secao titulo="4. O que foi contado (se quiser)">
        <Campo
          label="Escreva o que a pessoa disse no áudio"
          value={transcricao}
          onChangeText={setTranscricao}
          multiline
          maxLength={4000}
          dica="Ajuda quem não pode ouvir e é o texto conferido antes de a memória ir para o bairro."
        />
      </Secao>

      {erro ? <Recado tipo="erro" texto={erro} /> : null}
    </Folha>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: spacing.sm,
  },
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metade: {
    flexGrow: 1,
    flexBasis: 140,
  },
  bilhete: {
    gap: spacing.xs,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: '#FFFDF6',
    transform: [{ rotate: '-1deg' }],
    shadowColor: colors.sombra,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 1, height: 2 },
    elevation: 2,
  },
  fita: {
    position: 'absolute',
    top: -12,
    right: 28,
  },
  rotulo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  pergunta: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoMd + 2,
    lineHeight: (fontSize.manuscritoMd + 2) * 1.15,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  dica: {
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  arquivo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tinta,
  },
  foto: {
    alignSelf: 'center',
    padding: 10,
    backgroundColor: '#FFFDF6',
    transform: [{ rotate: '1.5deg' }],
  },
  imagem: {
    width: 240,
    height: 180,
  },
});
