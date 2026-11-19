import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { CapaDeEntrada } from '../components/CapaDeEntrada';
import { Recado } from '../components/Recado';
import { CONTA_DEMONSTRACAO, USANDO_MOCK } from '../config/appConfig';
import { useSessao } from '../contexts/SessaoContext';
import { colors, fonts, fontSize } from '../theme/theme';

/** Entrar com e-mail e senha (ASP.NET Identity da API). */
export default function EntrarScreen(): React.JSX.Element {
  const { status, entrar, error, clearError } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (status === 'pronto' || status === 'sem-familia' || status === 'sem-perfil') {
    return <Redirect href="/" />;
  }

  const enviar = async (comEmail = email, comSenha = senha): Promise<void> => {
    setEnviando(true);
    try {
      await entrar(comEmail, comSenha);
      router.replace('/');
    } catch {
      // A mensagem fica em `error`.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CapaDeEntrada subtitulo="O caderno de histórias que só a sua família sabe.">
      <Text style={styles.titulo}>Entrar</Text>
      <Campo
        label="E-mail"
        value={email}
        onChangeText={(texto) => {
          clearError();
          setEmail(texto);
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <Campo
        label="Senha"
        value={senha}
        onChangeText={(texto) => {
          clearError();
          setSenha(texto);
        }}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void enviar()}
      />
      {error ? <Recado tipo="erro" texto={error} /> : null}
      <Botao label="Entrar" icone="proxima" isLoading={enviando} disabled={!email || !senha} onPress={() => void enviar()} />
      <Botao label="Criar uma conta" variante="contorno" onPress={() => router.push('/cadastro')} />
      <Botao
        label={CONTA_DEMONSTRACAO.rotulo}
        variante="papel"
        accessibilityHint="Usa a conta de demonstração, com a Família Souza já montada"
        onPress={() => {
          setEmail(CONTA_DEMONSTRACAO.email);
          setSenha(CONTA_DEMONSTRACAO.senha);
          void enviar(CONTA_DEMONSTRACAO.email, CONTA_DEMONSTRACAO.senha);
        }}
      />
      <Text style={styles.modo}>{USANDO_MOCK ? 'Modo de demonstração: tudo fica neste celular.' : 'Conectado à API do Me Conta.'}</Text>
    </CapaDeEntrada>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    color: colors.tinta,
  },
  modo: {
    fontFamily: fonts.maquina,
    fontSize: fontSize.sm,
    color: colors.tintaSuave,
    textAlign: 'center',
  },
});
