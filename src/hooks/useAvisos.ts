import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { api } from '../services/api';
import type { Aviso } from '../types/api';

/** De quanto em quanto tempo o app pergunta à API se alguém apertou "quero contar". */
const INTERVALO_MS = 15000;

export type AvisosState = {
  avisos: Aviso[];
  marcarVisto: (avisoId: number) => Promise<void>;
};

/**
 * Avisos "quero contar" do porta-retrato (US15) que ninguém da família viu ainda.
 * Quando chega um aviso novo, o celular vibra uma vez.
 */
export function useAvisos(familiaId: number | null): AvisosState {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const vistos = useRef(new Set<number>());

  const carregar = useCallback(async () => {
    if (familiaId === null) {
      return;
    }
    try {
      const lista = await api.listarAvisos(familiaId, true);
      const novos = lista.filter((aviso) => !vistos.current.has(aviso.id));
      if (novos.length > 0 && vistos.current.size > 0 && Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
      lista.forEach((aviso) => vistos.current.add(aviso.id));
      setAvisos(lista);
    } catch {
      // Sem internet: tenta de novo no próximo ciclo.
    }
  }, [familiaId]);

  useEffect(() => {
    void Promise.resolve().then(carregar);
    const timer = setInterval(() => void carregar(), INTERVALO_MS);
    return () => clearInterval(timer);
  }, [carregar]);

  const marcarVisto = useCallback(async (avisoId: number) => {
    setAvisos((atual) => atual.filter((aviso) => aviso.id !== avisoId));
    try {
      await api.marcarAvisoVisto(avisoId);
    } catch {
      // Se falhar, o aviso volta na próxima consulta.
    }
  }, []);

  return { avisos, marcarVisto };
}
