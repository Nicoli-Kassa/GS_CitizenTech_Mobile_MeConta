import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

import { api } from '../services/api';
import { gravarPreferencia, lerPreferencia, limparDadosDaFamilia } from '../services/banco/banco';
import { garantirCatalogo, sincronizar } from '../services/sincronizacao';
import { gravarSessao, lerSessao } from '../services/tokenStorage';
import type { FamiliaResumo, Membro } from '../types/api';
import { ApiError, describeError, ehFalhaDeConexao } from '../utils/errors';

/**
 * Sessão de quem usa o app: login, perfil e a família aberta no caderno.
 *
 * Funciona sem internet: o último membro e a última família ficam no banco
 * local, e o caderno abre com o que já foi sincronizado. Quando a conexão
 * volta, o que foi feito no celular sobe sozinho para a API.
 */

export type StatusSessao = 'iniciando' | 'sem-sessao' | 'sem-perfil' | 'sem-familia' | 'pronto';

export type FamiliaAberta = { id: number; nome: string };

export type SessaoContextValue = {
  status: StatusSessao;
  membro: Membro | null;
  familia: FamiliaAberta | null;
  /** `true` enquanto baixa ou envia dados para a API. */
  sincronizando: boolean;
  /** `false` quando a última tentativa de falar com a API falhou por falta de conexão. */
  online: boolean;
  error: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  criarPerfil: (nome: string) => Promise<void>;
  criarFamilia: (nome: string) => Promise<void>;
  aceitarConvite: (codigo: string) => Promise<void>;
  sair: () => Promise<void>;
  sincronizarAgora: () => Promise<void>;
  clearError: () => void;
};

const SessaoContext = createContext<SessaoContextValue | null>(null);

const CHAVE_MEMBRO = 'sessao-membro';
const CHAVE_FAMILIA = 'sessao-familia';

async function lerJson<T>(chave: string): Promise<T | null> {
  const texto = await lerPreferencia(chave);
  if (!texto) {
    return null;
  }
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

type SessaoProviderProps = { children: ReactNode };

export function SessaoProvider({ children }: SessaoProviderProps): React.JSX.Element {
  const [status, setStatus] = useState<StatusSessao>('iniciando');
  const [membro, setMembro] = useState<Membro | null>(null);
  const [familia, setFamilia] = useState<FamiliaAberta | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const familiaRef = useRef<FamiliaAberta | null>(null);

  const rodarSincronizacao = useCallback(async (familiaId: number) => {
    setSincronizando(true);
    try {
      await sincronizar(familiaId);
      setOnline(true);
    } catch (falha) {
      if (ehFalhaDeConexao(falha)) {
        setOnline(false);
      } else if (falha instanceof ApiError && falha.status === 401) {
        setError('Sua sessão expirou. Entre de novo.');
        setStatus('sem-sessao');
      } else {
        setError(describeError(falha, 'Não foi possível atualizar o caderno.'));
      }
    } finally {
      setSincronizando(false);
    }
  }, []);

  const abrirFamilia = useCallback(
    async (escolhida: FamiliaResumo | FamiliaAberta) => {
      const aberta = { id: escolhida.id, nome: escolhida.nome };
      familiaRef.current = aberta;
      setFamilia(aberta);
      await gravarPreferencia(CHAVE_FAMILIA, JSON.stringify(aberta));
      setStatus('pronto');
      void rodarSincronizacao(aberta.id);
    },
    [rodarSincronizacao],
  );

  /** Com a sessão já definida: carrega perfil e família, ou usa o que está salvo se estiver offline. */
  const carregarSessao = useCallback(async () => {
    try {
      const perfil = await api.obterPerfil();
      setMembro(perfil);
      await gravarPreferencia(CHAVE_MEMBRO, JSON.stringify(perfil));

      const familias = await api.listarFamilias();
      const salva = await lerJson<FamiliaAberta>(CHAVE_FAMILIA);
      const escolhida = familias.find((f) => f.id === salva?.id) ?? familias[0];
      setOnline(true);
      if (!escolhida) {
        setStatus('sem-familia');
        return;
      }
      await abrirFamilia(escolhida);
    } catch (falha) {
      if (ehFalhaDeConexao(falha)) {
        // Sem internet: abre com o que já está no celular.
        const membroSalvo = await lerJson<Membro>(CHAVE_MEMBRO);
        const familiaSalva = await lerJson<FamiliaAberta>(CHAVE_FAMILIA);
        setOnline(false);
        if (membroSalvo && familiaSalva) {
          setMembro(membroSalvo);
          setFamilia(familiaSalva);
          familiaRef.current = familiaSalva;
          setStatus('pronto');
          return;
        }
        setError(describeError(falha));
        setStatus('sem-sessao');
        return;
      }
      if (falha instanceof ApiError && falha.status === 403) {
        setStatus('sem-perfil');
        return;
      }
      await gravarSessao(null);
      api.definirSessao(null);
      setError(describeError(falha, 'Não foi possível abrir a sua conta.'));
      setStatus('sem-sessao');
    }
  }, [abrirFamilia]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      setError(null);
      try {
        const sessao = await api.entrar(email.trim(), senha);
        api.definirSessao(sessao);
        await gravarSessao(sessao);
        await carregarSessao();
      } catch (falha) {
        setError(describeError(falha, 'Não foi possível entrar.'));
        throw falha;
      }
    },
    [carregarSessao],
  );

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      setError(null);
      try {
        await api.cadastrar(email.trim(), senha);
        const sessao = await api.entrar(email.trim(), senha);
        api.definirSessao(sessao);
        await gravarSessao(sessao);
        const perfil = await api.criarPerfil(nome.trim());
        setMembro(perfil);
        await gravarPreferencia(CHAVE_MEMBRO, JSON.stringify(perfil));
        setStatus('sem-familia');
      } catch (falha) {
        setError(describeError(falha, 'Não foi possível criar a conta.'));
        throw falha;
      }
    },
    [],
  );

  const criarPerfil = useCallback(
    async (nome: string) => {
      setError(null);
      await api.criarPerfil(nome.trim());
      await carregarSessao();
    },
    [carregarSessao],
  );

  const criarFamilia = useCallback(
    async (nome: string) => {
      setError(null);
      const criada = await api.criarFamilia(nome);
      await abrirFamilia(criada);
    },
    [abrirFamilia],
  );

  const aceitarConvite = useCallback(
    async (codigo: string) => {
      setError(null);
      const detalhe = await api.aceitarConvite(codigo);
      await abrirFamilia(detalhe);
    },
    [abrirFamilia],
  );

  useEffect(() => {
    // Token renovado no meio do uso: guarda o novo para o próximo login automático.
    api.aoRenovarSessao((sessao) => {
      void gravarSessao(sessao);
    });

    let ativo = true;
    (async () => {
      await garantirCatalogo();
      const sessao = await lerSessao();
      if (!ativo) {
        return;
      }
      if (sessao) {
        api.definirSessao(sessao);
        await carregarSessao();
        return;
      }
      setStatus('sem-sessao');
    })().catch((falha: unknown) => {
      setError(describeError(falha));
      setStatus('sem-sessao');
    });
    return () => {
      ativo = false;
    };
  }, [carregarSessao]);

  // Quando a internet volta, sobe o que ficou guardado no celular.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    const assinatura = Network.addNetworkStateListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false && familiaRef.current) {
        void rodarSincronizacao(familiaRef.current.id);
      }
    });
    return () => assinatura.remove();
  }, [rodarSincronizacao]);

  const sair = useCallback(async () => {
    api.definirSessao(null);
    await gravarSessao(null);
    await limparDadosDaFamilia();
    familiaRef.current = null;
    setMembro(null);
    setFamilia(null);
    setStatus('sem-sessao');
  }, []);

  const sincronizarAgora = useCallback(async () => {
    if (familiaRef.current) {
      await rodarSincronizacao(familiaRef.current.id);
    }
  }, [rodarSincronizacao]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<SessaoContextValue>(
    () => ({
      status,
      membro,
      familia,
      sincronizando,
      online,
      error,
      entrar,
      cadastrar,
      criarPerfil,
      criarFamilia,
      aceitarConvite,
      sair,
      sincronizarAgora,
      clearError,
    }),
    [status, membro, familia, sincronizando, online, error, entrar, cadastrar, criarPerfil, criarFamilia, aceitarConvite, sair, sincronizarAgora, clearError],
  );

  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

export function useSessao(): SessaoContextValue {
  const context = useContext(SessaoContext);
  if (!context) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>.');
  }
  return context;
}
