import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { CapaDeEntrada } from '../components/CapaDeEntrada';
import { Recado } from '../components/Recado';
import { useSessao } from '../contexts/SessaoContext';
import { colors, fonts, fontSize } from '../theme/theme';

/** Confere a senha antes de mandar: a API exige maiúscula, minúscula, número e símbolo. */
function problemaNaSenha(senha: string): string | null {
  if (senha.length === 0) {
    return null;
  }
  if (senha.length < 6 || !/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/\d/.test(senha) || !/[^A-Za-z0-9]/.test(senha)) {
    return 'Use 6 caracteres ou mais, com letra maiúscula, minúscula, número e símbolo.';
  }
  return null;
}

/** Criar conta: e-mail e senha no Identity, depois o perfil com o nome. Só isso. */
export default function CadastroScreen(): React.JSX.Element {
  const { cadastrar, error, clearError } = useSessao();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const erroDaSenha = problemaNaSenha(senha);
  const pronto = nome.trim().length > 0 && email.includes('@') && senha.length > 0 && !erroDaSenha;

  const enviar = async (): Promise<void> => {
    setEnviando(true);
    try {
      await cadastrar(nome, email, senha);
      router.replace('/');
    } catch {
      // A mensagem fica em `error`.
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CapaDeEntrada subtitulo="Crie a sua conta. Depois você monta o caderno da sua família.">
      <Text style={styles.titulo}>Criar conta</Text>
      <Campo
        label="Como você quer ser chamada"
        value={nome}
        onChangeText={(t) => {
          clearError();
          setNome(t);
        }}
        autoComplete="name"
        placeholder="Ex.: Nicoli"
      />
      <Campo
        label="E-mail"
        value={email}
        onChangeText={(t) => {
          clearError();
          setEmail(t);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo
        label="Senha"
        value={senha}
        onChangeText={(t) => {
          clearError();
          setSenha(t);
        }}
        secureTextEntry
        autoComplete="new-password"
        erro={erroDaSenha}
        dica="6 caracteres ou mais, com maiúscula, minúscula, número e símbolo."
      />
      {error ? <Recado tipo="erro" texto={error} /> : null}
      <Botao label="Criar conta" icone="pena" isLoading={enviando} disabled={!pronto} onPress={() => void enviar()} />
      <Botao label="Já tenho conta" variante="contorno" onPress={() => router.back()} />
    </CapaDeEntrada>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontFamily: fonts.manuscrita,
    fontSize: fontSize.manuscritoLg,
    color: colors.tinta,
  },
});
