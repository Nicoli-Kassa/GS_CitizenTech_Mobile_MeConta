import type { Categoria, Envio, Idoso, Pagina, Pergunta } from '../../types/api';
import type { Folha, FolhaEsperando, FolhaMemoria } from '../../types/caderno';
import { readBoolean, readNumber, readString, requireNumber, requireString } from '../../utils/parse';
import { abrirBanco } from './banco';

/**
 * Leitura e gravação no SQLite.
 *
 * Linhas do banco entram como `unknown` e são convertidas aqui, do mesmo
 * jeito que as respostas da API.
 */

type Linha = Record<string, unknown>;

// ---------- catálogo ----------

export async function salvarCategorias(categorias: readonly Categoria[]): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    for (const c of categorias) {
      await db.runAsync(
        `INSERT INTO categorias (id, slug, nome) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nome = excluded.nome`,
        c.id,
        c.slug,
        c.nome,
      );
    }
  });
}

export async function listarCategorias(): Promise<Categoria[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>('SELECT id, slug, nome FROM categorias ORDER BY id');
  return linhas.map((l) => ({ id: requireNumber(l, 'id'), slug: requireString(l, 'slug'), nome: requireString(l, 'nome') }));
}

export async function salvarPerguntas(perguntas: readonly Pergunta[]): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    for (const p of perguntas) {
      await db.runAsync(
        `INSERT INTO perguntas (id, texto, categoria_id, tipo) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET texto = excluded.texto, categoria_id = excluded.categoria_id, tipo = excluded.tipo`,
        p.id,
        p.texto,
        p.categoriaId,
        p.tipo,
      );
    }
  });
}

/** Perguntas com a marca "Já perguntada" calculada pelos envios daquele idoso (US04). */
export async function listarPerguntasParaIdoso(idosoId: number): Promise<Pergunta[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>(
    `SELECT p.id, p.texto, p.categoria_id, p.tipo,
            EXISTS (SELECT 1 FROM envios e WHERE e.idoso_id = ? AND e.pergunta_id = p.id) AS ja_perguntada
       FROM perguntas p
      ORDER BY p.categoria_id, p.id`,
    idosoId,
  );
  return linhas.map((l) => ({
    id: requireNumber(l, 'id'),
    texto: requireString(l, 'texto'),
    categoriaId: requireNumber(l, 'categoria_id'),
    tipo: readString(l, 'tipo') === 'DaFamilia' ? 'DaFamilia' : 'Catalogo',
    jaPerguntada: readBoolean(l, 'ja_perguntada') ?? false,
  }));
}

// ---------- idosos ----------

export async function substituirIdosos(familiaId: number, idosos: readonly Idoso[]): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM idosos WHERE familia_id = ?', familiaId);
    for (const i of idosos) {
      await db.runAsync(
        `INSERT INTO idosos (id, familia_id, nome, apelido, whatsapp, responde_sozinho, cadastrado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        i.id,
        i.familiaId,
        i.nome,
        i.apelido,
        i.whatsApp,
        i.respondeSozinho ? 1 : 0,
        i.cadastradoEm,
      );
    }
  });
}

function paraIdoso(l: Linha): Idoso {
  return {
    id: requireNumber(l, 'id'),
    familiaId: requireNumber(l, 'familia_id'),
    nome: requireString(l, 'nome'),
    apelido: requireString(l, 'apelido'),
    whatsApp: readString(l, 'whatsapp'),
    respondeSozinho: readBoolean(l, 'responde_sozinho') ?? false,
    cadastradoEm: requireString(l, 'cadastrado_em'),
  };
}

export async function listarIdosos(familiaId: number): Promise<Idoso[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>('SELECT * FROM idosos WHERE familia_id = ? ORDER BY apelido', familiaId);
  return linhas.map(paraIdoso);
}

// ---------- envios ----------

/**
 * Troca os envios já sincronizados de um idoso pelos que vieram da API.
 * Envios feitos sem internet (`sync = 'pendente'`) ficam.
 */
export async function substituirEnvios(idosoId: number, envios: readonly Envio[], categorias: Map<number, number>): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM envios WHERE idoso_id = ? AND sync = 'ok'", idosoId);
    for (const e of envios) {
      await db.runAsync(
        `INSERT INTO envios (id, idoso_id, pergunta_id, pergunta, categoria_id, mensagem, link_whatsapp,
                             status, enviado_em, respondido_em, pagina_id, sync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
         ON CONFLICT(id) DO NOTHING`,
        e.id,
        e.idosoId,
        e.perguntaId,
        e.pergunta,
        categorias.get(e.perguntaId) ?? 0,
        e.mensagem,
        e.linkWhatsApp,
        e.status,
        e.enviadoEm,
        e.respondidoEm,
        e.paginaId,
      );
    }
  });
}

// ---------- páginas ----------

/**
 * Troca as páginas sincronizadas pelas da API, sem perder o que só existe
 * no celular: páginas aguardando envio e os arquivos já baixados.
 */
export async function substituirPaginas(paginas: readonly Pagina[]): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    const chaves = paginas.map((p) => p.chaveIdempotencia);
    const marcadores = chaves.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM paginas WHERE sync = 'ok'${chaves.length > 0 ? ` AND chave NOT IN (${marcadores})` : ''}`,
      ...chaves,
    );
    for (const p of paginas) {
      await db.runAsync(
        `INSERT INTO paginas (chave, id, envio_id, idoso_id, idoso_apelido, titulo, pergunta, categoria_id,
                              duracao_segundos, audio_url, foto_url, criada_por_membro_id, criada_em, transcricao, sync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
         ON CONFLICT(chave) DO UPDATE SET
           id = excluded.id, envio_id = excluded.envio_id, idoso_apelido = excluded.idoso_apelido,
           titulo = excluded.titulo, duracao_segundos = excluded.duracao_segundos,
           audio_url = excluded.audio_url, foto_url = excluded.foto_url, transcricao = excluded.transcricao,
           sync = CASE WHEN paginas.sync = 'apagar' THEN 'apagar' ELSE 'ok' END`,
        p.chaveIdempotencia,
        p.id,
        p.envioId,
        p.idosoId,
        p.idosoApelido,
        p.titulo,
        p.pergunta,
        p.categoriaId,
        p.duracaoSegundos,
        p.audioUrl,
        p.fotoUrl,
        p.criadaPorMembroId,
        p.criadaEm,
        p.transcricao,
      );
    }
  });
}

/** Páginas sincronizadas cujo áudio ou foto ainda não está no celular. */
export async function listarArquivosParaBaixar(): Promise<
  { chave: string; id: number; audioUrl: string | null; fotoUrl: string | null; faltaAudio: boolean; faltaFoto: boolean }[]
> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>(
    `SELECT chave, id, audio_url, foto_url, audio_local, foto_local FROM paginas
      WHERE id IS NOT NULL AND sync = 'ok'
        AND ((audio_local IS NULL AND audio_url IS NOT NULL) OR (foto_local IS NULL AND foto_url IS NOT NULL))`,
  );
  return linhas.map((l) => ({
    chave: requireString(l, 'chave'),
    id: requireNumber(l, 'id'),
    audioUrl: readString(l, 'audio_url'),
    fotoUrl: readString(l, 'foto_url'),
    faltaAudio: readString(l, 'audio_local') === null && readString(l, 'audio_url') !== null,
    faltaFoto: readString(l, 'foto_local') === null && readString(l, 'foto_url') !== null,
  }));
}

export async function marcarArquivoLocal(chave: string, tipo: 'audio' | 'foto', uri: string): Promise<void> {
  const db = await abrirBanco();
  const coluna = tipo === 'audio' ? 'audio_local' : 'foto_local';
  await db.runAsync(`UPDATE paginas SET ${coluna} = ? WHERE chave = ?`, uri, chave);
}

function paraMemoria(l: Linha): FolhaMemoria {
  return {
    tipo: 'memoria',
    chave: requireString(l, 'chave'),
    id: readNumber(l, 'id'),
    envioId: requireNumber(l, 'envio_id'),
    idosoId: requireNumber(l, 'idoso_id'),
    idosoApelido: requireString(l, 'idoso_apelido'),
    titulo: requireString(l, 'titulo'),
    pergunta: requireString(l, 'pergunta'),
    categoriaId: requireNumber(l, 'categoria_id'),
    duracaoSegundos: readNumber(l, 'duracao_segundos') ?? 0,
    audioLocal: readString(l, 'audio_local'),
    fotoLocal: readString(l, 'foto_local'),
    temFoto: readString(l, 'foto_url') !== null || readString(l, 'foto_local') !== null,
    criadaPorMembroId: requireNumber(l, 'criada_por_membro_id'),
    criadaEm: requireString(l, 'criada_em'),
    transcricao: readString(l, 'transcricao'),
    bairroPublicado: readString(l, 'bairro_publicado'),
    aguardandoEnvio: readString(l, 'sync') === 'aguardando',
  };
}

function paraEsperando(l: Linha): FolhaEsperando {
  return {
    tipo: 'esperando',
    envioId: requireNumber(l, 'id'),
    idosoId: requireNumber(l, 'idoso_id'),
    idosoApelido: readString(l, 'apelido') ?? '',
    pergunta: requireString(l, 'pergunta'),
    categoriaId: readNumber(l, 'categoria_id') ?? 0,
    enviadoEm: requireString(l, 'enviado_em'),
  };
}

/**
 * Folhas do caderno na ordem do livro: primeiro as perguntas que esperam
 * resposta, depois as memórias da mais recente para a mais antiga (US09).
 */
export async function listarFolhas(familiaId: number): Promise<Folha[]> {
  const db = await abrirBanco();
  const esperando = await db.getAllAsync<Linha>(
    `SELECT e.id, e.idoso_id, e.pergunta, e.categoria_id, e.enviado_em, i.apelido
       FROM envios e JOIN idosos i ON i.id = e.idoso_id
      WHERE i.familia_id = ? AND e.status = 'Enviada'
        AND NOT EXISTS (SELECT 1 FROM paginas p WHERE p.envio_id = e.id AND p.sync <> 'apagar')
      ORDER BY e.enviado_em DESC`,
    familiaId,
  );
  const memorias = await db.getAllAsync<Linha>(
    `SELECT p.* FROM paginas p JOIN idosos i ON i.id = p.idoso_id
      WHERE i.familia_id = ? AND p.sync <> 'apagar'
      ORDER BY p.criada_em DESC`,
    familiaId,
  );
  return [...esperando.map(paraEsperando), ...memorias.map(paraMemoria)];
}

// ---------- gravação local e fila de sincronização (US10) ----------

/** Envio guardado no celular. Feito sem internet, recebe id negativo até a API responder. */
export type EnvioLocal = {
  id: number;
  idosoId: number;
  perguntaId: number;
  pergunta: string;
  categoriaId: number;
  mensagem: string;
  linkWhatsApp: string;
  status: 'Enviada' | 'Respondida';
  enviadoEm: string;
};

function paraEnvioLocal(l: Linha): EnvioLocal {
  return {
    id: requireNumber(l, 'id'),
    idosoId: requireNumber(l, 'idoso_id'),
    perguntaId: requireNumber(l, 'pergunta_id'),
    pergunta: requireString(l, 'pergunta'),
    categoriaId: readNumber(l, 'categoria_id') ?? 0,
    mensagem: requireString(l, 'mensagem'),
    linkWhatsApp: requireString(l, 'link_whatsapp'),
    status: readString(l, 'status') === 'Respondida' ? 'Respondida' : 'Enviada',
    enviadoEm: requireString(l, 'enviado_em'),
  };
}

export async function inserirEnvioPendente(envio: Omit<EnvioLocal, 'id' | 'status'>): Promise<number> {
  const db = await abrirBanco();
  const menor = await db.getFirstAsync<{ menor: number | null }>('SELECT MIN(id) AS menor FROM envios');
  const id = Math.min(-1, (menor?.menor ?? 0) - 1);
  await db.runAsync(
    `INSERT INTO envios (id, idoso_id, pergunta_id, pergunta, categoria_id, mensagem, link_whatsapp, status, enviado_em, sync)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Enviada', ?, 'pendente')`,
    id,
    envio.idosoId,
    envio.perguntaId,
    envio.pergunta,
    envio.categoriaId,
    envio.mensagem,
    envio.linkWhatsApp,
    envio.enviadoEm,
  );
  return id;
}

export async function obterEnvio(id: number): Promise<EnvioLocal | null> {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync<Linha>('SELECT * FROM envios WHERE id = ?', id);
  return linha ? paraEnvioLocal(linha) : null;
}

export async function listarEnviosPendentes(): Promise<EnvioLocal[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>("SELECT * FROM envios WHERE sync = 'pendente' ORDER BY enviado_em");
  return linhas.map(paraEnvioLocal);
}

/** Troca o id provisório (negativo) pelo da API, levando junto as páginas ligadas a ele. */
export async function confirmarEnvio(idLocal: number, idDaApi: number, link: string, mensagem: string): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM envios WHERE id = ? AND id <> ?', idDaApi, idLocal);
    await db.runAsync(
      "UPDATE envios SET id = ?, link_whatsapp = ?, mensagem = ?, sync = 'ok' WHERE id = ?",
      idDaApi,
      link,
      mensagem,
      idLocal,
    );
    await db.runAsync('UPDATE paginas SET envio_id = ? WHERE envio_id = ?', idDaApi, idLocal);
  });
}

export async function descartarEnvio(id: number): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM envios WHERE id = ?', id);
}

export type PaginaPendente = {
  chave: string;
  envioId: number;
  titulo: string | null;
  transcricao: string | null;
  duracaoSegundos: number;
  audioLocal: string;
  audioNome: string;
  fotoLocal: string | null;
};

/** Resposta guardada no celular, ainda sem id da API (US08 e US10). */
export async function inserirPaginaLocal(dados: {
  chave: string;
  envio: EnvioLocal;
  idosoApelido: string;
  titulo: string;
  transcricao: string | null;
  duracaoSegundos: number;
  audioLocal: string;
  audioNome: string;
  fotoLocal: string | null;
  criadaPorMembroId: number;
}): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO paginas (chave, id, envio_id, idoso_id, idoso_apelido, titulo, pergunta, categoria_id, duracao_segundos,
                            audio_url, foto_url, audio_local, foto_local, criada_por_membro_id, criada_em, transcricao, sync)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'aguardando')`,
      dados.chave,
      dados.envio.id,
      dados.envio.idosoId,
      dados.idosoApelido,
      dados.titulo,
      dados.envio.pergunta,
      dados.envio.categoriaId,
      Math.max(1, Math.round(dados.duracaoSegundos)),
      // audio_url guarda o nome original do arquivo até a API devolver o caminho dela.
      dados.audioNome,
      dados.audioLocal,
      dados.fotoLocal,
      dados.criadaPorMembroId,
      new Date().toISOString(),
      dados.transcricao,
    );
    await db.runAsync("UPDATE envios SET status = 'Respondida' WHERE id = ?", dados.envio.id);
  });
}

/** Páginas prontas para subir: o envio já existe na API (id positivo). */
export async function listarPaginasPendentes(): Promise<PaginaPendente[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>(
    "SELECT * FROM paginas WHERE sync = 'aguardando' AND envio_id > 0 ORDER BY criada_em",
  );
  return linhas.map((l) => ({
    chave: requireString(l, 'chave'),
    envioId: requireNumber(l, 'envio_id'),
    titulo: readString(l, 'titulo'),
    transcricao: readString(l, 'transcricao'),
    duracaoSegundos: readNumber(l, 'duracao_segundos') ?? 1,
    audioLocal: requireString(l, 'audio_local'),
    audioNome: readString(l, 'audio_url') ?? 'resposta.m4a',
    fotoLocal: readString(l, 'foto_local'),
  }));
}

export async function confirmarPagina(pagina: Pagina): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync(
    "UPDATE paginas SET id = ?, envio_id = ?, audio_url = ?, foto_url = ?, sync = 'ok' WHERE chave = ?",
    pagina.id,
    pagina.envioId,
    pagina.audioUrl,
    pagina.fotoUrl,
    pagina.chaveIdempotencia,
  );
}

export async function obterFolha(chave: string): Promise<FolhaMemoria | null> {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync<Linha>('SELECT * FROM paginas WHERE chave = ?', chave);
  return linha ? paraMemoria(linha) : null;
}

/**
 * Apagar (US11): página que nunca chegou à API sai na hora; as outras ficam
 * marcadas e somem da tela até a API confirmar.
 */
export async function marcarParaApagar(chave: string): Promise<void> {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync<Linha>('SELECT id, envio_id FROM paginas WHERE chave = ?', chave);
  if (!linha) {
    return;
  }
  await db.withTransactionAsync(async () => {
    if (readNumber(linha, 'id') === null) {
      await db.runAsync('DELETE FROM paginas WHERE chave = ?', chave);
    } else {
      await db.runAsync("UPDATE paginas SET sync = 'apagar' WHERE chave = ?", chave);
    }
    // Como na API: a pergunta volta a esperar resposta.
    await db.runAsync("UPDATE envios SET status = 'Enviada' WHERE id = ?", readNumber(linha, 'envio_id') ?? 0);
  });
}

export async function listarPaginasParaApagar(): Promise<{ chave: string; id: number }[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>("SELECT chave, id FROM paginas WHERE sync = 'apagar' AND id IS NOT NULL");
  return linhas.map((l) => ({ chave: requireString(l, 'chave'), id: requireNumber(l, 'id') }));
}

export async function removerPagina(chave: string): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync('DELETE FROM paginas WHERE chave = ?', chave);
}

export async function gravarTranscricaoLocal(chave: string, texto: string | null): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync('UPDATE paginas SET transcricao = ? WHERE chave = ?', texto, chave);
}

export async function gravarBairroPublicado(chave: string, bairro: string | null): Promise<void> {
  const db = await abrirBanco();
  await db.runAsync('UPDATE paginas SET bairro_publicado = ? WHERE chave = ?', bairro, chave);
}

/** Ids das perguntas já enviadas para o idoso (para a pergunta da semana não repetir). */
export async function listarPerguntasJaEnviadas(idosoId: number): Promise<Set<number>> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>('SELECT DISTINCT pergunta_id FROM envios WHERE idoso_id = ?', idosoId);
  return new Set(linhas.map((l) => requireNumber(l, 'pergunta_id')));
}
