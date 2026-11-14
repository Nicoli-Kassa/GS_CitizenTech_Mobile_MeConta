/**
 * Aviso simples de "os dados mudaram".
 *
 * Depois de cada gravação no banco local ou de uma sincronização, os hooks
 * que leem do SQLite recebem o aviso e recarregam a tela.
 */

type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function aoMudarDados(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function avisarMudanca(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}
