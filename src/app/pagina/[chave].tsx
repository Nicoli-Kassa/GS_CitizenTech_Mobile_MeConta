import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AlertaDePrivacidade, rotuloDoNivel } from '../../components/AlertaDePrivacidade';
import { Botao } from '../../components/Botao';
import { Campo } from '../../components/Campo';
import { Folha, Secao } from '../../components/Folha';
import { Marcar } from '../../components/Marcar';
import { PlayerDeAudio } from '../../components/PlayerDeAudio';
import { Recado } from '../../components/Recado';
import { useSessao } from '../../contexts/SessaoContext';
import { api } from '../../services/api';
import { PublicacaoRecusadaError } from '../../services/api/contrato';
import { gravarBairroPublicado, gravarTranscricaoLocal, marcarParaApagar, obterFolha } from '../../services/banco/repositorios';
import { aoMudarDados, avisarMudanca } from '../../services/eventos';
import type { AnalisePrivacidade, ExplicacaoDeRisco } from '../../types/api';
import type { FolhaMemoria } from '../../types/caderno';
import { colors, fonts, fontSize, radius, spacing } from '../../theme/theme';
import { ApiError, describeError } from '../../utils/errors';
import { formatarData } from '../../utils/regras';

const BAIRRO_PILOTO = 'Pirituba';

/**
 * A página inteira (US09, US11, US16 e US18): ouvir, escrever o que foi
 * contado, levar a memória ao caderno do bairro e apagar.
 *
 * Antes de publicar, a API passa título e transcrição pelo filtro de dados
 * pessoais. Se encontrar algo, a IA explica o risco em linguagem simples e
 * sugere uma versão sem os dados.
 */
export default function PaginaScreen(): React.JSX.Element {
  const { chave } = useLocalSearchParams<{ chave: string }>();
  const { membro, online, sincronizarAgora } = useSessao();
  const [folha, setFolha] = useState<FolhaMemoria | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvandoTexto, setSalvandoTexto] = useState(false);

  const [bairro, setBairro] = useState(BAIRRO_PILOTO);
  const [autorizou, setAutorizou] = useState(false);
  const [confirmou, setConfirmou] = useState(false);
  const [analise, setAnalise] = useState<AnalisePrivacidade | null>(null);
  const [explicacao, setExplicacao] = useState<ExplicacaoDeRisco | null>(null);
  const [ocupado, setOcupado] = useState<'analisando' | 'publicando' | 'tirando' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [apagando, setApagando] = useState(false);

  const carregar = useCallback(async () => {
    setFolha(await obterFolha(chave));
    setCarregando(false);
  }, [chave]);

  useEffect(() => {
    void Promise.resolve().then(carregar);
    return aoMudarDados(() => void carregar());
  }, [carregar]);

  const limparAnalise = (): void => {
    setAnalise(null);
    setExplicacao(null);
    setConfirmou(false);
  };

  const salvarTexto = async (): Promise<void> => {
    if (!folha) {
      return;
    }
    setErro(null);
    setSalvandoTexto(true);
    try {
      const novo = texto.trim() || null;
      if (folha.id !== null) {
        await api.definirTranscricao(folha.id, novo);
      }
      // Página ainda no celular: o texto sobe junto com ela.
      await gravarTranscricaoLocal(folha.chave, novo);
      avisarMudanca();
      setEditando(false);
      limparAnalise();
    } catch (falha) {
      setErro(describeError(falha, 'Não foi possível salvar o texto.'));
    } finally {
      setSalvandoTexto(false);
    }
  };

  /** Busca a explicação do risco (IA). Se falhar, a análise do filtro continua na tela. */
  const explicar = async (paginaId: number): Promise<void> => {
    try {
      setExplicacao(await api.explicarRisco(paginaId));
    } catch {
      setExplicacao(null);
    }
  };

  const conferir = async (): Promise<void> => {
    if (folha?.id === null || !folha) {
      return;
    }
    setErro(null);
    setRecado(null);
    limparAnalise();
    setOcupado('analisando');
    try {
      const resultado = await api.analisarPrivacidade(folha.id);
      setAnalise(resultado);
      if (resultado.resultado !== 'Liberada') {
        await explicar(folha.id);
      }
    } catch (falha) {
      setErro(describeError(falha, 'Não foi possível conferir a memória agora.'));
    } finally {
      setOcupado(null);
    }
  };

  const publicar = async (): Promise<void> => {
    if (!folha || folha.id === null) {
      return;
    }
    setErro(null);
    setOcupado('publicando');
    try {
      const publicacao = await api.publicarNoBairro(folha.id, {
        bairro,
        idosoAutorizou: autorizou,
        confirmoDadosPessoais: confirmou,
      });
      await gravarBairroPublicado(folha.chave, publicacao.memoria.bairro);
      avisarMudanca();
      limparAnalise();
      setRecado(`Publicada no caderno de ${publicacao.memoria.bairro}. Só aparecem o título, o apelido e o áudio.`);
    } catch (falha) {
      if (falha instanceof PublicacaoRecusadaError) {
        setAnalise(falha.analise);
        await explicar(folha.id);
      } else if (falha instanceof ApiError && falha.status === 409) {
        await gravarBairroPublicado(folha.chave, bairro.trim());
        avisarMudanca();
      } else {
        setErro(describeError(falha, 'Não foi possível publicar agora.'));
      }
    } finally {
      setOcupado(null);
    }
  };

  const tirarDoMapa = async (): Promise<void> => {
    if (!folha || folha.id === null) {
      return;
    }
    setErro(null);
    setOcupado('tirando');
    try {
      await api.tirarDoMapa(folha.id);
    } catch (falha) {
      if (!(falha instanceof ApiError && falha.status === 404)) {
        setErro(describeError(falha));
        setOcupado(null);
        return;
      }
    }
    await gravarBairroPublicado(folha.chave, null);
    avisarMudanca();
    setRecado('A memória saiu do caderno do bairro. Continua no caderno da família.');
    setOcupado(null);
  };

  const usarVersaoSegura = async (): Promise<void> => {
    if (!folha || folha.id === null || !analise?.versaoSegura.transcricao) {
      return;
    }
    setErro(null);
    setOcupado('analisando');
    try {
      await api.definirTranscricao(folha.id, analise.versaoSegura.transcricao);
      await gravarTranscricaoLocal(folha.chave, analise.versaoSegura.transcricao);
      avisarMudanca();
      const nova = await api.analisarPrivacidade(folha.id);
      setExplicacao(null);
      setConfirmou(false);
      setAnalise(nova);
      if (nova.resultado !== 'Liberada') {
        await explicar(folha.id);
      }
    } catch (falha) {
      setErro(describeError(falha));
    } finally {
      setOcupado(null);
    }
  };

  const apagar = async (): Promise<void> => {
    if (!folha) {
      return;
    }
    await marcarParaApagar(folha.chave);
    avisarMudanca();
    void sincronizarAgora();
    router.back();
  };

  if (carregando) {
    return (
      <Folha titulo="Página">
        <Text style={styles.texto}>Abrindo…</Text>
      </Folha>
    );
  }

  if (!folha) {
    return (
      <Folha titulo="Página">
        <Recado texto="Esta página não está mais no caderno." />
      </Folha>
    );
  }

  const souQuemGuardou = membro?.id === folha.criadaPorMembroId;
  const podePublicar = autorizou && bairro.trim().length > 0 && (analise?.resultado === 'Liberada' || (analise?.resultado === 'PrecisaConfirmar' && confirmou));

  return (
    <Folha titulo={folha.titulo} sobretitulo={`${folha.idosoApelido} · ${formatarData(folha.criadaEm)}`} voltar="Voltar">
      <View style={styles.coluna}>
        <Text style={styles.rotulo}>A pergunta</Text>
        <Text style={styles.pergunta}>“{folha.pergunta}”</Text>
      </View>
      <PlayerDeAudio fonte={folha.audioLocal} apelido={folha.idosoApelido} duracaoSegundos={folha.duracaoSegundos} />
      {folha.aguardandoEnvio ? <Recado tipo="aviso" texto="Guardada no celular. Vai para a nuvem quando tiver internet." /> : null}

      <Secao titulo={`O que ${folha.idosoApelido} contou`}>
        {editando ? (
          <View style={styles.coluna}>
            <Campo label="O que foi dito no áudio" value={texto} onChangeText={setTexto} multiline maxLength={4000} dica={`${texto.length} de 4000 caracteres`} />
            <Botao label="Salvar o texto" icone="pena" isLoading={salvandoTexto} onPress={() => void salvarTexto()} />
            <Botao label="Cancelar" variante="contorno" onPress={() => setEditando(false)} />
          </View>
        ) : (
          <View style={styles.coluna}>
            <Text style={folha.transcricao ? styles.texto : styles.vazio}>
              {folha.transcricao ?? 'Ainda ninguém escreveu o que foi contado neste áudio.'}
            </Text>
            <Botao
              label={folha.transcricao ? 'Editar o texto' : 'Escrever o que foi contado'}
              variante="contorno"
              onPress={() => {
                setTexto(folha.transcricao ?? '');
                setEditando(true);
              }}
            />
          </View>
        )}
      </Secao>

      <Secao titulo="Levar para o caderno do bairro">
        {recado ? <Recado tipo="sucesso" texto={recado} /> : null}
        {folha.bairroPublicado ? (
          <View style={styles.coluna}>
            <Text style={styles.texto}>
              Esta memória está no caderno de {folha.bairroPublicado}. Os vizinhos veem o título, o apelido e ouvem o áudio; nunca o telefone, o nome completo ou o endereço.
            </Text>
            <Botao label="Ver o caderno do bairro" variante="papel" onPress={() => router.push({ pathname: '/bairro', params: { bairro: folha.bairroPublicado ?? BAIRRO_PILOTO } })} />
            <Botao label="Tirar do caderno do bairro" variante="contorno" isLoading={ocupado === 'tirando'} onPress={() => void tirarDoMapa()} />
          </View>
        ) : folha.id === null ? (
          <Recado texto="Assim que a página subir para a nuvem, ela pode ir para o caderno do bairro." />
        ) : !online ? (
          <Recado tipo="aviso" texto="Levar para o bairro precisa de internet." />
        ) : (
          <View style={styles.coluna}>
            <Text style={styles.texto}>
              Algumas memórias são do bairro inteiro: a padaria que virou farmácia, a festa da rua. Antes de publicar, o Me Conta confere se o texto não tem dados pessoais.
            </Text>
            <Campo
              label="Bairro"
              value={bairro}
              onChangeText={(t) => {
                setBairro(t);
                limparAnalise();
              }}
              dica="Só o nome do bairro, sem rua nem número."
            />
            <Marcar label={`${folha.idosoApelido} autorizou levar esta memória para o bairro`} marcado={autorizou} onChange={setAutorizou} />
            <Botao label="Conferir antes de publicar" icone="pena" variante={analise ? 'contorno' : 'tinta'} isLoading={ocupado === 'analisando'} onPress={() => void conferir()} />

            {analise ? (
              <View style={styles.coluna}>
                <View style={styles.indice} accessible accessibilityLabel={`Índice Risco Cidadão: ${analise.indiceRiscoCidadao} de 100, ${rotuloDoNivel(analise.faixa)}`}>
                  <Text style={styles.indiceNumero}>{analise.indiceRiscoCidadao}</Text>
                  <View style={styles.indiceTextos}>
                    <Text style={styles.rotulo}>Índice Risco Cidadão (0 a 100)</Text>
                    <Text style={styles.indiceFaixa}>{rotuloDoNivel(analise.faixa)}</Text>
                  </View>
                </View>

                {analise.resultado === 'Liberada' ? (
                  <Recado tipo="sucesso" titulo="Nada pessoal encontrado" texto="A memória pode ir para o caderno do bairro." />
                ) : (
                  <View style={styles.coluna}>
                    <Recado
                      tipo={analise.resultado === 'Bloqueada' ? 'erro' : 'aviso'}
                      titulo={analise.resultado === 'Bloqueada' ? 'Esta memória não pode ir assim para o bairro' : 'Confirme antes de publicar'}
                      texto={explicacao?.resumo ?? `Encontramos ${analise.achados.length} dado(s) pessoal(is) no texto.`}
                    />
                    {explicacao
                      ? explicacao.alertas.map((alerta) => <AlertaDePrivacidade key={`${alerta.rotulo}-${alerta.trechos.join()}`} alerta={alerta} />)
                      : analise.achados.map((achado) => (
                          <AlertaDePrivacidade
                            key={`${achado.regraId}-${achado.trechoMascarado}`}
                            alerta={{ rotulo: achado.rotulo, nivel: achado.nivel, trechos: [achado.trechoMascarado], alerta: `Tem ${achado.rotulo.toLowerCase()} no texto.`, riscoReal: achado.explicacao, oQueFazer: 'Tire esse dado do texto antes de publicar.' }}
                          />
                        ))}
                    {explicacao ? <Text style={styles.fonte}>Explicação escrita por: {explicacao.fonte}. A IA só recebe o texto já escondido.</Text> : null}

                    {analise.versaoSegura.transcricao ? (
                      <View style={styles.versao}>
                        <Text style={styles.rotulo}>Versão sem os dados pessoais</Text>
                        <Text style={styles.texto}>{analise.versaoSegura.transcricao}</Text>
                        <Botao label="Usar esta versão no texto" variante="papel" isLoading={ocupado === 'analisando'} onPress={() => void usarVersaoSegura()} />
                      </View>
                    ) : null}

                    {analise.resultado === 'PrecisaConfirmar' ? (
                      <Marcar label={`Conversei com ${folha.idosoApelido}, que quer contar isso ao bairro`} marcado={confirmou} onChange={setConfirmou} />
                    ) : null}
                  </View>
                )}

                {analise.resultado !== 'Bloqueada' ? (
                  <Botao
                    label={analise.resultado === 'Liberada' ? `Publicar em ${bairro.trim() || 'o bairro'}` : 'Publicar mesmo assim'}
                    isLoading={ocupado === 'publicando'}
                    disabled={!podePublicar}
                    helperText={!autorizou ? `Marque que ${folha.idosoApelido} autorizou.` : null}
                    onPress={() => void publicar()}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )}
        {erro ? <Recado tipo="erro" texto={erro} /> : null}
      </Secao>

      <Secao titulo="Apagar">
        {!souQuemGuardou ? (
          <Text style={styles.vazio}>Só quem guardou a página pode apagá-la.</Text>
        ) : apagando ? (
          <View style={styles.coluna}>
            <Recado tipo="aviso" titulo="Apagar esta página?" texto="Ela some do caderno de todos da família, e a pergunta volta a esperar resposta." />
            <Botao label="Sim, apagar de vez" onPress={() => void apagar()} />
            <Botao label="Cancelar" variante="contorno" onPress={() => setApagando(false)} />
          </View>
        ) : (
          <Botao label="Apagar esta página" variante="contorno" onPress={() => setApagando(true)} />
        )}
      </Secao>
    </Folha>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: spacing.md,
  },
  rotulo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  pergunta: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * 1.4,
    color: colors.tinta,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  vazio: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.md,
    color: colors.tintaSuave,
  },
  fonte: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  versao: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.tinta,
    backgroundColor: '#FFFDF6',
  },
  indice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  indiceNumero: {
    minWidth: 64,
    textAlign: 'center',
    fontFamily: fonts.maquina,
    fontSize: fontSize.xl + 6,
    color: colors.tinta,
    borderWidth: 2,
    borderColor: colors.tinta,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
  },
  indiceTextos: {
    flex: 1,
  },
  indiceFaixa: {
    fontFamily: fonts.livroNegrito,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
});
