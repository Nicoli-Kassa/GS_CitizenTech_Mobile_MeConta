import type { Pagina, Pergunta } from '../types/api';
import { api } from './api';
import { CATEGORIAS, PERGUNTAS_DO_CATALOGO } from './api/catalogo';
import { abrirBanco } from './banco/banco';
import {
  listarArquivosParaBaixar,
  listarCategorias,
  marcarArquivoLocal,
  salvarCategorias,
  salvarPerguntas,
  substituirEnvios,
  substituirIdosos,
  substituirPaginas,
} from './banco/repositorios';
import { avisarMudanca } from './eventos';

/**
 * Sincronização entre o banco do celular e a API (US10).
 *
 * 1. Envia o que foi feito sem internet, na ordem certa.
 * 2. Baixa família, idosos, perguntas, envios e páginas.
 * 3. Baixa os áudios e as fotos que ainda não estão no celular.
 *
 * Se a conexão cair no meio, nada se perde: o que não foi enviado continua
 * marcado no banco e vai na próxima tentativa.
 */

let emAndamento: Promise<void> | null = null;

/** Catálogo que vem com o app: as perguntas funcionam offline desde o primeiro uso. */
export async function garantirCatalogo(): Promise<void> {
  const categorias = await listarCategorias();
  if (categorias.length === 0) {
    await salvarCategorias(CATEGORIAS);
    await salvarPerguntas(PERGUNTAS_DO_CATALOGO);
  }
}

async function baixarTodasAsPaginas(familiaId: number): Promise<Pagina[]> {
  const tamanho = 50;
  const primeira = await api.listarCaderno(familiaId, 1, tamanho);
  const todas = [...primeira.itens];
  for (let numero = 2; numero <= primeira.totalDePaginas; numero += 1) {
    const lista = await api.listarCaderno(familiaId, numero, tamanho);
    todas.push(...lista.itens);
  }
  return todas;
}

async function baixarDadosDaFamilia(familiaId: number): Promise<void> {
  const [categorias, familia] = await Promise.all([api.listarCategorias(), api.obterFamilia(familiaId)]);
  await salvarCategorias(categorias);
  await substituirIdosos(familiaId, familia.idosos);

  const perguntas = new Map<number, Pergunta>();
  for (const idoso of familia.idosos) {
    const [doIdoso, envios] = await Promise.all([api.listarPerguntas(idoso.id), api.listarEnvios(idoso.id)]);
    doIdoso.forEach((pergunta) => perguntas.set(pergunta.id, pergunta));
    const categoriaPorPergunta = new Map(doIdoso.map((p) => [p.id, p.categoriaId]));
    await substituirEnvios(idoso.id, envios, categoriaPorPergunta);
  }
  await salvarPerguntas([...perguntas.values()]);
  await substituirPaginas(await baixarTodasAsPaginas(familiaId));
}

/** Áudios e fotos são baixados um por um; uma falha não impede os outros. */
async function baixarArquivos(): Promise<void> {
  const pendentes = await listarArquivosParaBaixar();
  for (const item of pendentes) {
    try {
      if (item.faltaAudio && item.audioUrl) {
        const uri = await api.baixarArquivo(item.audioUrl, `pagina-${item.id}-audio`);
        await marcarArquivoLocal(item.chave, 'audio', uri);
      }
      if (item.faltaFoto && item.fotoUrl) {
        const uri = await api.baixarArquivo(item.fotoUrl, `pagina-${item.id}-foto`);
        await marcarArquivoLocal(item.chave, 'foto', uri);
      }
    } catch {
      // Tenta de novo na próxima sincronização.
    }
  }
}

/** Uma sincronização por vez; chamadas repetidas aproveitam a que está rodando. */
export function sincronizar(familiaId: number): Promise<void> {
  emAndamento ??= (async () => {
    try {
      await abrirBanco();
      await garantirCatalogo();
      await baixarDadosDaFamilia(familiaId);
      avisarMudanca();
      await baixarArquivos();
      avisarMudanca();
    } finally {
      emAndamento = null;
    }
  })();
  return emAndamento;
}
