import type { Pergunta } from '../types/api';
import { AppError } from './errors';

/**
 * Regras de negócio que o app também precisa conhecer: para validar antes de
 * enviar, para funcionar sem internet e para o modo de demonstração.
 * As mensagens são as mesmas da API.
 */

export const MENSAGENS = {
  nomeFamiliaVazio: 'Dê um nome para a família',
  nomeFamiliaLongo: 'Use até 60 caracteres',
  telefoneInvalido: 'Confira o número do WhatsApp',
  telefoneRepetido: 'Esse número já está na família',
  semWhatsApp: 'Cadastre o WhatsApp',
  perguntaCurta: 'Escreva uma pergunta um pouco maior',
  perguntaLonga: 'Use até 200 caracteres',
  perguntaSemCategoria: 'Escolha uma categoria para a pergunta',
  pedidoSuspeito: 'O Me Conta não envia pedidos de dinheiro ou senhas',
  conviteInvalido: 'Código inválido ou expirado. Peça um novo.',
  jaRespondida: 'Essa pergunta já foi respondida',
  arquivoNaoEhAudio: 'Escolha um arquivo de áudio (mp3, m4a, ogg ou opus)',
  audioGrande: 'Áudio muito grande: o limite é 20 MB',
  apelidoVazio: 'Diga como a família chama essa pessoa',
  nomeVazio: 'Escreva o nome',
} as const;

export const LIMITE_AUDIO_BYTES = 20 * 1024 * 1024;
export const EXTENSOES_AUDIO = ['mp3', 'm4a', 'ogg', 'opus'] as const;

export function validarNomeDaFamilia(nome: string): string {
  const limpo = nome.trim();
  if (limpo.length === 0) {
    throw new AppError(MENSAGENS.nomeFamiliaVazio);
  }
  if (limpo.length > 60) {
    throw new AppError(MENSAGENS.nomeFamiliaLongo);
  }
  return limpo;
}

/**
 * WhatsApp no formato do link wa.me: 55 + DDD + número, só dígitos.
 * Aceita "(11) 98765-4321", "11987654321" ou "+55 11 98765-4321".
 */
export function normalizarTelefone(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  let internacional: string;
  if (digitos.length === 10 || digitos.length === 11) {
    internacional = `55${digitos}`;
  } else if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    internacional = digitos;
  } else {
    throw new AppError(MENSAGENS.telefoneInvalido);
  }
  // Nenhum DDD brasileiro começa com 0.
  if (internacional[2] === '0') {
    throw new AppError(MENSAGENS.telefoneInvalido);
  }
  return internacional;
}

/** Mostra 5511987654321 como (11) 98765-4321. */
export function formatarTelefone(internacional: string | null): string {
  if (!internacional) {
    return '';
  }
  const local = internacional.startsWith('55') ? internacional.slice(2) : internacional;
  const ddd = local.slice(0, 2);
  const numero = local.slice(2);
  const corte = numero.length === 9 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

function semAcentos(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const PADROES_DE_GOLPE: readonly RegExp[] = [
  /\bpix\b/,
  /\bsenhas?\b/,
  /\bcodigo\s+(de\s+)?(verificacao|seguranca|confirmacao|acesso|sms)\b/,
  /\bcodigo\s+que\s+(chegou|recebeu|apareceu|veio)\b/,
  /\b(numero|dados|foto|frente|verso)\s+do\s+(seu\s+)?cartao\b/,
  /\b(manda|mande|envia|envie|transfere|transfira|empresta|empreste|deposita|deposite|passa|passe|faz|faca|arruma|arrume)\s+(me\s+)?((um|uma|o|a|uns|umas)\s+)?(dinheiro|grana|transferencia|deposito|emprestimo)\b/,
  /\bme\s+empresta/,
];

/**
 * Mesmo filtro da API: falar de dinheiro pode ("como a senhora economizava?"),
 * pedir dinheiro, PIX, senha ou código não pode.
 */
export function ehPedidoSuspeito(texto: string): boolean {
  const normalizado = semAcentos(texto);
  return PADROES_DE_GOLPE.some((padrao) => padrao.test(normalizado));
}

export function validarPerguntaPropria(texto: string, categoriaId: number | null): string {
  const limpo = texto.trim();
  if (limpo.length < 10) {
    throw new AppError(MENSAGENS.perguntaCurta);
  }
  if (limpo.length > 200) {
    throw new AppError(MENSAGENS.perguntaLonga);
  }
  if (categoriaId === null) {
    throw new AppError(MENSAGENS.perguntaSemCategoria);
  }
  if (ehPedidoSuspeito(limpo)) {
    throw new AppError(MENSAGENS.pedidoSuspeito);
  }
  return limpo;
}

/** "Vó Laura, me conta: qual é o segredo do seu bolo?" */
export function montarMensagem(apelido: string, pergunta: string): string {
  return `${apelido}, me conta: ${pergunta}`;
}

export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

/** Data de hoje no fuso de São Paulo (AAAA-MM-DD). */
export function hojeEmSaoPaulo(agora = new Date()): string {
  const local = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

const SEGUNDA_DE_REFERENCIA = Date.UTC(2024, 0, 1);
const DIA_MS = 24 * 60 * 60 * 1000;

/** Semana de segunda a domingo que contém a data, com o número usado na sugestão. */
export function semanaContendo(data: string): { inicio: string; fim: string; numero: number } {
  const [ano, mes, dia] = data.split('-').map(Number);
  const instante = Date.UTC(ano ?? 2024, (mes ?? 1) - 1, dia ?? 1);
  const diasDesdeSegunda = (new Date(instante).getUTCDay() + 6) % 7;
  const inicio = instante - diasDesdeSegunda * DIA_MS;
  const fim = inicio + 6 * DIA_MS;
  return {
    inicio: new Date(inicio).toISOString().slice(0, 10),
    fim: new Date(fim).toISOString().slice(0, 10),
    numero: Math.floor((inicio - SEGUNDA_DE_REFERENCIA) / (7 * DIA_MS)),
  };
}

/**
 * Pergunta da semana (US05), igual à da API: só do catálogo, nunca repetida,
 * a mesma durante a semana e diferente para cada idoso.
 */
export function sugerirPergunta(
  idosoId: number,
  perguntas: readonly Pergunta[],
  idsJaEnviados: ReadonlySet<number>,
  numeroDaSemana: number,
): Pergunta | null {
  const candidatas = perguntas
    .filter((pergunta) => pergunta.tipo === 'Catalogo' && !idsJaEnviados.has(pergunta.id))
    .sort((a, b) => a.id - b.id);
  if (candidatas.length === 0) {
    return null;
  }
  const posicao = numeroDaSemana + idosoId * 7;
  const indice = ((posicao % candidatas.length) + candidatas.length) % candidatas.length;
  return candidatas[indice] ?? null;
}

/** "3:05" */
export function formatarDuracao(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const;

/** "12 de novembro de 2026", no fuso de São Paulo. */
export function formatarData(iso: string): string {
  const data = hojeEmSaoPaulo(new Date(iso));
  const [ano, mes, dia] = data.split('-').map(Number);
  return `${dia ?? ''} de ${MESES[(mes ?? 1) - 1] ?? ''} de ${ano ?? ''}`;
}
