import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useSessao } from '../contexts/SessaoContext';
import { colors, fonts, fontSize } from '../theme/theme';
import { describeError } from '../utils/errors';
import { validarNomeDaFamilia } from '../utils/regras';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { CapaDeEntrada } from './CapaDeEntrada';
import { Recado } from './Recado';

/**
 * Primeiro uso: escrever o nome da família na capa (US01) ou entrar com o
 * código de convite de um parente (US03). Também pede o nome, se faltar o perfil.
 */
export function BoasVindas(): React.JSX.Element {
  const { status, membro, criarPerfil, criarFamilia, aceitarConvite, sair } = useSessao();
  const [modo, setModo] = useState<'criar' | 'convite'>('criar');
  const [nomeFamilia, setNomeFamilia] = useState('');
  const [nomePessoa, setNomePessoa] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const rodar = async (acao: () => Promise<void>): Promise<void> => {
    setErro(null);
    setEnviando(true);
    try {
      await acao();
    } catch (falha) {
      setErro(describeError(falha));
    } finally {
      setEnviando(false);
    }
  };

  if (status === 'sem-perfil') {
    return (
      <CapaDeEntrada subtitulo="Falta só uma coisa antes de abrir o caderno.">
        <Campo label="Como você quer ser chamada" value={nomePessoa} onChangeText={setNomePessoa} placeholder="Ex.: Bia" />
        {erro ? <Recado tipo="erro" texto={erro} /> : null}
        <Botao
          label="Continuar"
          isLoading={enviando}
          disabled={nomePessoa.trim().length === 0}
          onPress={() => void rodar(() => criarPerfil(nomePessoa))}
        />
      </CapaDeEntrada>
    );
  }

  return (
    <CapaDeEntrada subtitulo={`Que bom ter você aqui${membro ? `, ${membro.nome}` : ''}. Vamos montar o caderno da família?`}>
      {modo === 'criar' ? (
        <>
          <Text style={styles.titulo}>Escreva o nome da família na capa</Text>
          <Campo
            label="Nome da família"
            value={nomeFamilia}
            onChangeText={(t) => {
              setErro(null);
              setNomeFamilia(t);
            }}
            placeholder="Ex.: Família Oliveira"
            maxLength={80}
            dica={`${nomeFamilia.trim().length} de 60 caracteres`}
          />
          {erro ? <Recado tipo="erro" texto={erro} /> : null}
          <Botao
            label="Criar o caderno"
            icone="pena"
            isLoading={enviando}
            onPress={() =>
              void rodar(async () => {
                validarNomeDaFamilia(nomeFamilia);
                await criarFamilia(nomeFamilia.trim());
              })
            }
          />
          <Botao label="Tenho um código de convite" variante="contorno" onPress={() => setModo('convite')} />
        </>
      ) : (
        <>
          <Text style={styles.titulo}>Entrar no caderno de alguém da família</Text>
          <Campo
            label="Código de convite"
            value={codigo}
            onChangeText={(t) => {
              setErro(null);
              setCodigo(t.toUpperCase());
            }}
            autoCapitalize="characters"
            maxLength={6}
            dica="São 6 letras e números. O convite vale por 48 horas."
            style={styles.codigo}
          />
          {erro ? <Recado tipo="erro" texto={erro} /> : null}
          <Botao
            label="Entrar"
            isLoading={enviando}
            disabled={codigo.trim().length < 6}
            onPress={() => void rodar(() => aceitarConvite(codigo))}
          />
          <Botao label="Criar um caderno novo" variante="contorno" onPress={() => setModo('criar')} />
        </>
      )}
      <Botao label="Sair da conta" variante="papel" onPress={() => void sair()} />
    </CapaDeEntrada>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoMd,
    lineHeight: fontSize.manuscritoMd * 1.15,
    color: colors.tinta,
  },
  codigo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.xl,
    letterSpacing: 6,
    textAlign: 'center',
  },
});
