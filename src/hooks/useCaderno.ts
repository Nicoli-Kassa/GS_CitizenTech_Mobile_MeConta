import { useCallback, useEffect, useState } from 'react';

import { listarCategorias, listarFolhas, listarIdosos } from '../services/banco/repositorios';
import { aoMudarDados } from '../services/eventos';
import type { Categoria, Idoso } from '../types/api';
import type { Folha } from '../types/caderno';
import { describeError } from '../utils/errors';

export type CadernoState = {
  folhas: Folha[];
  categorias: Categoria[];
  idosos: Idoso[];
  isLoading: boolean;
  error: string | null;
};

/**
 * Folhas do caderno lidas do banco local. Recarrega sozinho quando a
 * sincronização ou uma gravação avisa que os dados mudaram.
 */
export function useCaderno(familiaId: number | null): CadernoState {
  const [state, setState] = useState<CadernoState>({
    folhas: [],
    categorias: [],
    idosos: [],
    isLoading: true,
    error: null,
  });

  const carregar = useCallback(async () => {
    if (familiaId === null) {
      return;
    }
    try {
      const [folhas, categorias, idosos] = await Promise.all([
        listarFolhas(familiaId),
        listarCategorias(),
        listarIdosos(familiaId),
      ]);
      setState({ folhas, categorias, idosos, isLoading: false, error: null });
    } catch (falha) {
      setState((atual) => ({
        ...atual,
        isLoading: false,
        error: describeError(falha, 'Não foi possível abrir o caderno.'),
      }));
    }
  }, [familiaId]);

  useEffect(() => {
    void carregar();
    return aoMudarDados(() => {
      void carregar();
    });
  }, [carregar]);

  return state;
}
