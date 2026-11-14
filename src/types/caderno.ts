/**
 * Folhas do caderno da família, como aparecem na tela.
 *
 * - `memoria`: resposta guardada (áudio, título, foto opcional).
 * - `esperando`: pergunta enviada pelo WhatsApp que ainda não tem resposta.
 *   Aparece como uma página em branco com a pergunta escrita no alto.
 */

export type FolhaMemoria = {
  tipo: 'memoria';
  /** Chave de idempotência: identifica a página mesmo antes de ela ter id na API. */
  chave: string;
  id: number | null;
  envioId: number;
  idosoId: number;
  idosoApelido: string;
  titulo: string;
  pergunta: string;
  categoriaId: number;
  duracaoSegundos: number;
  /** Arquivo no celular, se já foi baixado; senão `null`. */
  audioLocal: string | null;
  fotoLocal: string | null;
  temFoto: boolean;
  criadaPorMembroId: number;
  criadaEm: string;
  /** Guardada sem internet e ainda não enviada para a API (US10). */
  aguardandoEnvio: boolean;
};

export type FolhaEsperando = {
  tipo: 'esperando';
  envioId: number;
  idosoId: number;
  idosoApelido: string;
  pergunta: string;
  categoriaId: number;
  enviadoEm: string;
};

export type Folha = FolhaMemoria | FolhaEsperando;

export function chaveDaFolha(folha: Folha): string {
  return folha.tipo === 'memoria' ? `m-${folha.chave}` : `e-${folha.envioId}`;
}
