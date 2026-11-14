import { useReducedMotion } from 'react-native-reanimated';

/**
 * `true` quando a pessoa ligou "Remover animações" / "Reduzir movimento"
 * no celular. Nesse caso as animações de virar página e abrir o caderno
 * viram um esmaecimento curto.
 */
export function useMovimentoReduzido(): boolean {
  return useReducedMotion();
}
