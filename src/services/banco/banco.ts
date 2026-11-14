import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

/**
 * Banco local (SQLite) do Me Conta.
 *
 * As telas leem sempre daqui, com ou sem internet (US10). A sincronização
 * (`services/sincronizacao.ts`) copia os dados da API para cá e envia o que
 * foi feito sem conexão.
 *
 * As migrações usam o `PRAGMA user_version`: cada item da lista abaixo roda
 * uma única vez, na ordem, e o número da versão fica gravado no arquivo.
 */

const NOME_DO_BANCO = 'meconta.db';

const MIGRACOES: readonly string[] = [
  // 1: estrutura inicial
  `
  CREATE TABLE IF NOT EXISTS preferencias (
    chave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS perguntas (
    id INTEGER PRIMARY KEY NOT NULL,
    texto TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    tipo TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS idosos (
    id INTEGER PRIMARY KEY NOT NULL,
    familia_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    apelido TEXT NOT NULL,
    whatsapp TEXT,
    responde_sozinho INTEGER NOT NULL DEFAULT 0,
    cadastrado_em TEXT NOT NULL
  );

  -- id negativo = envio feito sem internet, ainda sem id da API.
  CREATE TABLE IF NOT EXISTS envios (
    id INTEGER PRIMARY KEY NOT NULL,
    idoso_id INTEGER NOT NULL,
    pergunta_id INTEGER NOT NULL,
    pergunta TEXT NOT NULL,
    categoria_id INTEGER NOT NULL DEFAULT 0,
    mensagem TEXT NOT NULL,
    link_whatsapp TEXT NOT NULL,
    status TEXT NOT NULL,
    enviado_em TEXT NOT NULL,
    respondido_em TEXT,
    pagina_id INTEGER,
    sync TEXT NOT NULL DEFAULT 'ok'
  );

  -- A chave de idempotência identifica a página antes de ela ter id na API.
  -- sync: 'ok' (igual à API), 'aguardando' (criada sem internet), 'apagar'.
  CREATE TABLE IF NOT EXISTS paginas (
    chave TEXT PRIMARY KEY NOT NULL,
    id INTEGER,
    envio_id INTEGER NOT NULL,
    idoso_id INTEGER NOT NULL,
    idoso_apelido TEXT NOT NULL,
    titulo TEXT NOT NULL,
    pergunta TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    duracao_segundos INTEGER NOT NULL,
    audio_url TEXT,
    foto_url TEXT,
    audio_local TEXT,
    foto_local TEXT,
    criada_por_membro_id INTEGER NOT NULL,
    criada_em TEXT NOT NULL,
    sync TEXT NOT NULL DEFAULT 'ok'
  );

  CREATE INDEX IF NOT EXISTS ix_paginas_criada_em ON paginas (criada_em DESC);
  CREATE INDEX IF NOT EXISTS ix_envios_status ON envios (status);
  `,
];

let banco: Promise<SQLiteDatabase> | null = null;

async function migrar(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;

  while (versao < MIGRACOES.length) {
    const script = MIGRACOES[versao];
    if (script === undefined) {
      break;
    }
    await db.withTransactionAsync(async () => {
      await db.execAsync(script);
    });
    versao += 1;
    // PRAGMA não aceita parâmetro: o número vem da própria lista, nunca do usuário.
    await db.execAsync(`PRAGMA user_version = ${versao}`);
  }
}

/** Abre o banco uma única vez e aplica as migrações pendentes. */
export function abrirBanco(): Promise<SQLiteDatabase> {
  banco ??= openDatabaseAsync(NOME_DO_BANCO).then(async (db) => {
    await migrar(db);
    return db;
  });
  return banco;
}

export async function lerPreferencia(chave: string): Promise<string | null> {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM preferencias WHERE chave = ?', chave);
  return linha?.valor ?? null;
}

export async function gravarPreferencia(chave: string, valor: string | null): Promise<void> {
  const db = await abrirBanco();
  if (valor === null) {
    await db.runAsync('DELETE FROM preferencias WHERE chave = ?', chave);
    return;
  }
  await db.runAsync(
    'INSERT INTO preferencias (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor',
    chave,
    valor,
  );
}

/** Apaga os dados da família (ao sair da conta). O catálogo fica. */
export async function limparDadosDaFamilia(): Promise<void> {
  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM idosos; DELETE FROM envios; DELETE FROM paginas;');
    await db.runAsync("DELETE FROM preferencias WHERE chave <> 'mock-servidor'");
  });
}
