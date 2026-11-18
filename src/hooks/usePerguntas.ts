import { useCallback, useEffect, useState } from 'react';

import { listarPerguntasParaIdoso } from '../services/banco/repositorios';
import { aoMudarDados } from '../services/eventos';
import type { Pergunta } from '../types/api';

/**
 * Perguntas do catálogo e da família, com a marca "Já perguntada" para o
 * idoso escolhido (US04). Vêm do banco local: funcionam sem internet.
 */
export function usePerguntas(idosoId: number | null): { perguntas: Pergunta[]; isLoading: boolean } {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (idosoId === null) {
      setPerguntas([]);
      setIsLoading(false);
      return;
    }
    try {
      setPerguntas(await listarPerguntasParaIdoso(idosoId));
    } finally {
      setIsLoading(false);
    }
  }, [idosoId]);

  useEffect(() => {
    void Promise.resolve().then(carregar);
    return aoMudarDados(() => {
      void carregar();
    });
  }, [carregar]);

  return { perguntas, isLoading };
}
