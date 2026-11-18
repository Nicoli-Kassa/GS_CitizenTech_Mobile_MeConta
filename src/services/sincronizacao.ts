import type { ArquivoLocal, Pagina, Pergunta } from '../types/api';
import { extensaoDe } from '../utils/arquivos';
import { ApiError, ehFalhaDeConexao } from '../utils/errors';
import { api } from './api';
import { CATEGORIAS, PERGUNTAS_DO_CATALOGO } from './api/catalogo';
import { abrirBanco } from './banco/banco';
import {
  confirmarEnvio,
  confirmarPagina,
  listarArquivosParaBaixar,
  listarCategorias,
  listarEnviosPendentes,
  listarPaginasParaApagar,
  listarPaginasPendentes,
  marcarArquivoLocal,
  removerPagina,
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

const TIPOS: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

export function arquivoLocal(uri: string, nome: string): ArquivoLocal {
  const extensao = nome.split('.').pop()?.toLowerCase() ?? '';
  return { uri, nome, tipo: TIPOS[extensao] ?? 'application/octet-stream' };
}

/**
 * Envia, na ordem certa, o que foi feito no celular: primeiro as perguntas
 * enviadas pelo WhatsApp, depois as respostas (que dependem do envio) e por
 * fim as páginas apagadas. Uma falha de conexão interrompe tudo e fica para
 * a próxima vez; um erro de regra numa página não trava as outras.
 */
async function enviarPendencias(): Promise<void> {
  for (const envio of await listarEnviosPendentes()) {
    const criado = await api.enviarPergunta(envio.idosoId, envio.perguntaId);
    await confirmarEnvio(envio.id, criado.id, criado.linkWhatsApp, criado.mensagem);
  }

  for (const pagina of await listarPaginasPendentes()) {
    try {
      const nomeDaFoto = pagina.fotoLocal ? `foto.${extensaoDe(pagina.fotoLocal) || 'jpg'}` : null;
      const criada = await api.guardarResposta(pagina.envioId, {
        titulo: pagina.titulo,
        transcricao: pagina.transcricao,
        duracaoSegundos: pagina.duracaoSegundos,
        // A mesma chave em todas as tentativas: a API devolve a página que já existe, sem duplicar.
        chaveIdempotencia: pagina.chave,
        audio: arquivoLocal(pagina.audioLocal, pagina.audioNome),
        foto: pagina.fotoLocal && nomeDaFoto ? arquivoLocal(pagina.fotoLocal, nomeDaFoto) : null,
      });
      await confirmarPagina(criada);
    } catch (falha) {
      if (ehFalhaDeConexao(falha)) {
        throw falha;
      }
    }
  }

  for (const pagina of await listarPaginasParaApagar()) {
    try {
      await api.apagarPagina(pagina.id);
      await removerPagina(pagina.chave);
    } catch (falha) {
      if (falha instanceof ApiError && falha.status === 404) {
        await removerPagina(pagina.chave);
      } else if (ehFalhaDeConexao(falha)) {
        throw falha;
      }
    }
  }
}

/**
 * Uma sincronização por vez. Se alguém pedir outra no meio (uma resposta nova
 * guardada, por exemplo), ela roda de novo logo em seguida.
 */
let pedirDeNovo = false;

export function sincronizar(familiaId: number): Promise<void> {
  if (emAndamento) {
    pedirDeNovo = true;
    return emAndamento;
  }
  emAndamento = (async () => {
    try {
      await abrirBanco();
      await garantirCatalogo();
      do {
        pedirDeNovo = false;
        await enviarPendencias();
        await baixarDadosDaFamilia(familiaId);
        avisarMudanca();
      } while (pedirDeNovo);
      await baixarArquivos();
      avisarMudanca();
    } finally {
      emAndamento = null;
    }
  })();
  return emAndamento;
}
