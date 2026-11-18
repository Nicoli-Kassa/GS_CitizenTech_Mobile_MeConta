import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carimbo, Fita } from '../components/Enfeites';
import { Folha, Secao } from '../components/Folha';
import { Recado } from '../components/Recado';
import { USANDO_MOCK } from '../config/appConfig';
import { useSessao } from '../contexts/SessaoContext';
import { useAvisos } from '../hooks/useAvisos';
import { useCaderno } from '../hooks/useCaderno';
import { api } from '../services/api';
import type { Convite, Idoso, IndicadorConversas, MembroDaFamilia, PortaRetrato } from '../types/api';
import { colors, fonts, fontSize, radius, spacing } from '../theme/theme';
import { describeError } from '../utils/errors';
import { formatarData, formatarTelefone } from '../utils/regras';

/**
 * Nossa família (US02, US03, US12, US14 e US15): os avós cadastrados, o
 * porta-retrato de cada um, o painel "Conversas de verdade", o convite para
 * outros parentes e o caderno do bairro.
 */
export default function FamiliaScreen(): React.JSX.Element {
  const { familia, membro, online, sair, sincronizarAgora } = useSessao();
  const { idosos } = useCaderno(familia?.id ?? null);
  const { avisos, marcarVisto } = useAvisos(familia?.id ?? null);

  const [membros, setMembros] = useState<MembroDaFamilia[]>([]);
  const [indicador, setIndicador] = useState<IndicadorConversas | null>(null);
  const [portaRetratos, setPortaRetratos] = useState<Record<number, PortaRetrato | null>>({});
  const [convite, setConvite] = useState<Convite | null>(null);
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [erroConvite, setErroConvite] = useState<string | null>(null);

  const [cadastrando, setCadastrando] = useState(false);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [erroIdoso, setErroIdoso] = useState<string | null>(null);
  const [salvandoIdoso, setSalvandoIdoso] = useState(false);

  const carregarOnline = useCallback(async () => {
    if (!familia) {
      return;
    }
    try {
      const [detalhe, painel] = await Promise.all([api.obterFamilia(familia.id), api.obterIndicador()]);
      setMembros(detalhe.membros);
      setIndicador(painel);
      const pares = await Promise.all(
        detalhe.idosos.map(async (i) => [i.id, await api.obterPortaRetrato(i.id).catch(() => null)] as const),
      );
      setPortaRetratos(Object.fromEntries(pares));
    } catch {
      // Sem internet: a tela mostra só o que está no celular.
    }
  }, [familia]);

  useEffect(() => {
    void Promise.resolve().then(carregarOnline);
  }, [carregarOnline]);

  const cadastrarIdoso = async (): Promise<void> => {
    if (!familia) {
      return;
    }
    setErroIdoso(null);
    setSalvandoIdoso(true);
    try {
      // A API confere e normaliza o telefone (55 + DDD + número) e recusa número repetido.
      await api.cadastrarIdoso(familia.id, { nome, apelido, whatsApp: whatsApp.trim() || null });
      await sincronizarAgora();
      await carregarOnline();
      setCadastrando(false);
      setNome('');
      setApelido('');
      setWhatsApp('');
    } catch (falha) {
      setErroIdoso(describeError(falha, 'Não foi possível cadastrar agora. Cadastrar precisa de internet.'));
    } finally {
      setSalvandoIdoso(false);
    }
  };

  const gerarConvite = async (): Promise<void> => {
    if (!familia) {
      return;
    }
    setErroConvite(null);
    setGerandoConvite(true);
    try {
      setConvite(await api.gerarConvite(familia.id));
    } catch (falha) {
      setErroConvite(describeError(falha, 'Gerar o convite precisa de internet.'));
    } finally {
      setGerandoConvite(false);
    }
  };

  return (
    <Folha titulo="Nossa família" sobretitulo={familia?.nome ?? ''} voltar="Voltar">
      {avisos.map((aviso) => (
        <View key={aviso.id} style={styles.coluna}>
          <Recado
            tipo="aviso"
            titulo={`${aviso.apelido} quer contar!`}
            texto={`Apertou "quero contar" no porta-retrato${aviso.pergunta ? ` para responder: “${aviso.pergunta}”` : ''}.`}
          />
          <Botao label="Já vi" variante="contorno" onPress={() => void marcarVisto(aviso.id)} />
        </View>
      ))}

      <Secao titulo="Os avós">
        {idosos.map((idoso, indice) => (
          <CartaoDoIdoso key={idoso.id} idoso={idoso} portaRetrato={portaRetratos[idoso.id]} inclinacao={indice % 2 === 0 ? -1.5 : 1.2} />
        ))}
        {idosos.length === 0 ? <Recado texto="Ninguém cadastrado ainda. Comece pela avó ou pelo avô que vai receber as perguntas." /> : null}

        {cadastrando ? (
          <View style={styles.formulario}>
            <Text style={styles.subtitulo}>Só três coisas. Nada de CPF, endereço ou dado de saúde.</Text>
            <Campo label="Nome" value={nome} onChangeText={setNome} autoComplete="name" placeholder="Ex.: Antônia Ribeiro" />
            <Campo label="Como a família chama" value={apelido} onChangeText={setApelido} placeholder="Ex.: Vó Tuca" />
            <Campo
              label="WhatsApp com DDD"
              value={whatsApp}
              onChangeText={setWhatsApp}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="(11) 98888-0001"
              dica="Pode deixar em branco e cadastrar depois."
            />
            {erroIdoso ? <Recado tipo="erro" texto={erroIdoso} /> : null}
            <Botao label="Salvar" icone="pena" isLoading={salvandoIdoso} disabled={!nome.trim() || !apelido.trim()} onPress={() => void cadastrarIdoso()} />
            <Botao label="Cancelar" variante="contorno" onPress={() => setCadastrando(false)} />
          </View>
        ) : (
          <Botao label="Adicionar avó ou avô" icone="familia" variante="papel" onPress={() => setCadastrando(true)} />
        )}
      </Secao>

      <Secao titulo="Conversas de verdade">
        <Painel indicador={indicador} online={online} />
      </Secao>

      <Secao titulo="Chamar alguém da família">
        <Text style={styles.texto}>Gere um código e mande para a sua mãe, um tio ou um primo. Com ele, a pessoa entra no caderno.</Text>
        {convite ? (
          <View style={styles.convite} accessible accessibilityLabel={`Código de convite ${convite.codigo.split('').join(' ')}, vale até ${formatarData(convite.expiraEm)}`}>
            <Text style={styles.codigo}>{convite.codigo}</Text>
            <Text style={styles.validade}>vale por 48 horas, até {formatarData(convite.expiraEm)}</Text>
          </View>
        ) : null}
        {erroConvite ? <Recado tipo="erro" texto={erroConvite} /> : null}
        {convite ? (
          <Botao
            label="Mandar o código"
            icone="envelope"
            onPress={() =>
              void Share.share({
                message: `Entra no caderno da ${familia?.nome ?? 'nossa família'} no Me Conta com o código ${convite.codigo}. Vale por 48 horas.`,
              })
            }
          />
        ) : (
          <Botao label="Gerar código de convite" isLoading={gerandoConvite} onPress={() => void gerarConvite()} />
        )}
        {membros.length > 0 ? (
          <Text style={styles.texto}>
            No caderno: {membros.map((m) => `${m.nome}${m.papel === 'Criador' ? ' (criou o caderno)' : ''}`).join(', ')}.
          </Text>
        ) : null}
      </Secao>

      <Secao titulo="O bairro">
        <Text style={styles.texto}>Veja as memórias que os avós de Pirituba já dividiram com os vizinhos.</Text>
        <Botao label="Abrir o caderno do bairro" variante="papel" onPress={() => router.push('/bairro')} />
      </Secao>

      <Secao titulo="Conta">
        <Text style={styles.texto}>
          {membro ? `Você entrou como ${membro.nome}. ` : ''}
          {USANDO_MOCK ? 'Modo de demonstração: os dados ficam só neste celular.' : 'Os dados ficam na API do Me Conta e neste celular.'}
        </Text>
        <Botao
          label="Sair da conta"
          variante="contorno"
          onPress={() => {
            void sair().then(() => router.replace('/entrar'));
          }}
        />
      </Secao>
    </Folha>
  );
}

function CartaoDoIdoso({ idoso, portaRetrato, inclinacao }: { idoso: Idoso; portaRetrato: PortaRetrato | null | undefined; inclinacao: number }): React.JSX.Element {
  return (
    <View style={[styles.polaroid, { transform: [{ rotate: `${inclinacao}deg` }] }]}>
      <Fita style={styles.fita} largura={64} rotacao={inclinacao * 2} />
      <Text style={styles.apelido} accessibilityRole="header">
        {idoso.apelido}
      </Text>
      <Text style={styles.texto}>{idoso.nome}</Text>
      <Text style={styles.detalhe}>{idoso.whatsApp ? `WhatsApp ${formatarTelefone(idoso.whatsApp)}` : 'Sem WhatsApp no cadastro'}</Text>
      <View style={styles.selos}>
        {idoso.respondeSozinho ? <Carimbo texto="responde sozinho" cor={colors.sucesso} rotacao={-3} /> : null}
        {portaRetrato ? (
          <Carimbo texto={portaRetrato.conectado ? 'porta-retrato ligado' : 'porta-retrato desligado'} cor={portaRetrato.conectado ? colors.sucesso : colors.tintaSuave} rotacao={2} />
        ) : null}
      </View>
      {!idoso.respondeSozinho ? (
        <Botao
          label={`Ensinar ${idoso.apelido} a responder`}
          variante="contorno"
          onPress={() => router.push({ pathname: '/ensine/[idosoId]', params: { idosoId: String(idoso.id) } })}
        />
      ) : null}
    </View>
  );
}

function Painel({ indicador, online }: { indicador: IndicadorConversas | null; online: boolean }): React.JSX.Element {
  if (!indicador) {
    return online ? <ActivityIndicator color={colors.tinta} /> : <Recado tipo="aviso" texto="O painel precisa de internet." />;
  }
  if (indicador.percentualConversasDeVerdade === null) {
    return <Recado texto={indicador.mensagem ?? 'Ainda não há dados'} />;
  }
  const percentual = Math.round(indicador.percentualConversasDeVerdade);
  const minutos = Math.round(indicador.minutosDeAudio * 10) / 10;
  return (
    <View style={styles.painel}>
      <Text style={styles.texto}>
        Semana de {indicador.semanaInicio.split('-').reverse().join('/')} a {indicador.semanaFim.split('-').reverse().join('/')}
      </Text>
      <View style={styles.numeros}>
        <View style={styles.numero} accessible accessibilityLabel={`${percentual} por cento dos avós responderam pelo menos uma pergunta nesta semana`}>
          <Text style={styles.valor}>{percentual}%</Text>
          <Text style={styles.legenda}>
            dos avós responderam nesta semana ({indicador.idososQueResponderam} de {indicador.idososCadastrados})
          </Text>
        </View>
        <View style={styles.numero} accessible accessibilityLabel={`${minutos} minutos de áudio guardados nesta semana`}>
          <Text style={styles.valor}>{minutos.toLocaleString('pt-BR')}</Text>
          <Text style={styles.legenda}>minutos de áudio guardados</Text>
        </View>
      </View>
      <View style={styles.barra} aria-hidden>
        <View style={[styles.barraCheia, { width: `${Math.min(100, percentual)}%` }]} />
      </View>
      <Text style={styles.detalhe}>{indicador.idososQueRespondemSozinhos} respondem sem ajuda depois do “Ensine sua avó”.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coluna: {
    gap: spacing.sm,
  },
  texto: {
    fontFamily: fonts.livro,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.5,
    color: colors.tinta,
  },
  subtitulo: {
    fontFamily: fonts.livroItalico,
    fontSize: fontSize.md,
    color: colors.tinta,
  },
  detalhe: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
  },
  formulario: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.pauta,
  },
  polaroid: {
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: '#FFFDF6',
    shadowColor: colors.sombra,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
  },
  fita: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
  },
  apelido: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    color: colors.tinta,
  },
  selos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  painel: {
    gap: spacing.md,
  },
  numeros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  numero: {
    flexGrow: 1,
    flexBasis: 140,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.tinta,
    backgroundColor: '#FFFDF6',
  },
  valor: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoXl,
    color: colors.tinta,
  },
  legenda: {
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tinta,
  },
  barra: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.pauta,
    overflow: 'hidden',
  },
  barraCheia: {
    height: 12,
    backgroundColor: colors.sucesso,
  },
  convite: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.tinta,
    borderRadius: radius.sm,
    backgroundColor: '#FFFDF6',
  },
  codigo: {
    fontFamily: fonts.maquina,
    fontSize: 40,
    letterSpacing: 8,
    color: colors.tinta,
  },
  validade: {
    fontFamily: fonts.livro,
    fontSize: fontSize.sm,
    color: colors.tinta,
  },
});
