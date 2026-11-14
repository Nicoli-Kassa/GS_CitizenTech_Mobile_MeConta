import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CONTA_DEMONSTRACAO, USANDO_MOCK } from '../config/appConfig';
import { api } from '../services/api';
import { gravarPreferencia, lerPreferencia, limparDadosDaFamilia } from '../services/banco/banco';
import { garantirCatalogo, sincronizar } from '../services/sincronizacao';
import { gravarToken, lerToken } from '../services/tokenStorage';
import type { Membro } from '../types/api';
import { ApiError, describeError, ehFalhaDeConexao } from '../utils/errors';

/**
 * Sessão de quem usa o app: login, perfil e a família aberta no caderno.
 *
 * Funciona sem internet: o último membro e a última família ficam no banco
 * local, e o caderno abre com o que já foi sincronizado.
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

  /** Com o token já definido: carrega perfil e família, ou usa o que está salvo se estiver offline. */
  const carregarSessao = useCallback(async () => {
    try {
      const perfil = await api.obterPerfil();
      setMembro(perfil);
      await gravarPreferencia(CHAVE_MEMBRO, JSON.stringify(perfil));

      const familias = await api.listarFamilias();
      const salva = await lerJson<FamiliaAberta>(CHAVE_FAMILIA);
      const escolhida = familias.find((f) => f.id === salva?.id) ?? familias[0];
      if (!escolhida) {
        setStatus('sem-familia');
        return;
      }
      const aberta = { id: escolhida.id, nome: escolhida.nome };
      familiaRef.current = aberta;
      setFamilia(aberta);
      await gravarPreferencia(CHAVE_FAMILIA, JSON.stringify(aberta));
      setOnline(true);
      setStatus('pronto');
      void rodarSincronizacao(aberta.id);
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
      await gravarToken(null);
      api.definirToken(null);
      setError(describeError(falha, 'Não foi possível abrir a sua conta.'));
      setStatus('sem-sessao');
    }
  }, [rodarSincronizacao]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      setError(null);
      try {
        const sessao = await api.entrar(email.trim(), senha);
        api.definirToken(sessao.accessToken);
        await gravarToken(sessao.accessToken);
        await carregarSessao();
      } catch (falha) {
        setError(describeError(falha, 'Não foi possível entrar.'));
        throw falha;
      }
    },
    [carregarSessao],
  );

  useEffect(() => {
    let ativo = true;
    (async () => {
      await garantirCatalogo();
      const token = await lerToken();
      if (!ativo) {
        return;
      }
      if (token) {
        api.definirToken(token);
        await carregarSessao();
        return;
      }
      if (USANDO_MOCK) {
        // Modo de demonstração: entra direto como a Bia, para o caderno abrir na hora.
        await entrar(CONTA_DEMONSTRACAO.email, CONTA_DEMONSTRACAO.senha).catch(() => setStatus('sem-sessao'));
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
  }, [carregarSessao, entrar]);

  const sair = useCallback(async () => {
    api.definirToken(null);
    await gravarToken(null);
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
    () => ({ status, membro, familia, sincronizando, online, error, entrar, sair, sincronizarAgora, clearError }),
    [status, membro, familia, sincronizando, online, error, entrar, sair, sincronizarAgora, clearError],
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
