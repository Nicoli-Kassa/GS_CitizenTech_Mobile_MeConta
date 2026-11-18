import type { Achado, AlertaDeRisco, AnalisePrivacidade, ExplicacaoDeRisco, NivelDeRisco, ResultadoDaAnalise } from '../../types/api';

/**
 * Versão reduzida do filtro de dados pessoais da API, só para o modo de
 * demonstração (sem servidor). Cobre os casos que aparecem no protótipo:
 * CPF, senha, telefone, saúde, endereço e rotina da casa.
 *
 * Com a API ligada, quem decide é o motor completo em C# (17 regras,
 * validação do CPF, combinações de dados e explicação pela IA).
 */

type Regra = {
  tipo: string;
  rotulo: string;
  nivel: Exclude<NivelDeRisco, 'Baixo'>;
  padrao: RegExp;
  mascara: 'digitos' | 'total' | 'palavras';
  substituicao: string;
  valida?: (trecho: string) => boolean;
};

/** Mesmo cálculo de dígitos verificadores usado pela API. */
function cpfValido(trecho: string): boolean {
  const digitos = trecho.replace(/\D/g, '');
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }
  const calcular = (quantidade: number): number => {
    let soma = 0;
    for (let i = 0; i < quantidade; i += 1) {
      soma += Number(digitos[i]) * (quantidade + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(digitos[9]) && calcular(10) === Number(digitos[10]);
}

const REGRAS: readonly Regra[] = [
  {
    tipo: 'Cpf',
    rotulo: 'CPF',
    nivel: 'Alto',
    padrao: /(?<!\d)\d{3}[ .]?\d{3}[ .]?\d{3}[ ./-]{0,2}\d{2}(?!\d)/g,
    mascara: 'digitos',
    substituicao: '[CPF removido]',
    valida: cpfValido,
  },
  {
    tipo: 'Senha',
    rotulo: 'Senha',
    nivel: 'Alto',
    padrao: /\bsenhas?\b[^0-9\n]{0,50}?\d{4,8}(?!\d)/g,
    mascara: 'total',
    substituicao: '[senha removida]',
  },
  {
    tipo: 'Telefone',
    rotulo: 'Telefone',
    nivel: 'Medio',
    padrao: /(?<!\d)(?:\+?55[ .-]?)?\(?\d{2}\)?[ .-]?\d{4,5}[ .-]?\d{4}(?!\d)/g,
    mascara: 'digitos',
    substituicao: '[telefone removido]',
    valida: (trecho) => !cpfValido(trecho),
  },
  {
    tipo: 'Saude',
    rotulo: 'Dado de saúde',
    nivel: 'Medio',
    padrao:
      /\b(?:remedio\w*(?:\s+(?:para|pra|de)\s+(?:a\s+|o\s+)?[a-z]+)?|pressao\s+(?:alta|baixa)|diabet\w*|hipertens\w*|insulina|alzheimer|parkinson|depressao|cancer|avc|derrame|infarto|comprimidos?|quimioterapia)\b/g,
    mascara: 'palavras',
    substituicao: '[dado de saúde removido]',
  },
  {
    tipo: 'Endereco',
    rotulo: 'Endereço',
    nivel: 'Medio',
    padrao: /\b(?:rua|avenida|av\.?|travessa|alameda|praca)\s+(?:[a-z]+\s+){0,4}[a-z]+,?\s*(?:n(?:o|umero)?\.?\s*)?\d{1,5}(?!\d)(?!\s*(?:anos|vezes|metros))/g,
    mascara: 'palavras',
    substituicao: '[endereço removido]',
  },
  {
    tipo: 'Vulnerabilidade',
    rotulo: 'Rotina da casa',
    nivel: 'Medio',
    padrao: /\b(?:moro|mora|morava|vivo|vive)\s+sozinh[oa]\b|\b(?:fico|fica)\s+sozinh[oa]\b|\bguard[oa]\s+(?:o\s+|meu\s+)?dinheiro\s+(?:em\s+casa|debaixo|no\s+colchao)/g,
    mascara: 'palavras',
    substituicao: '[informação sobre a rotina da casa removida]',
  },
];

const EXPLICACOES: Record<string, { alerta: string; riscoReal: string; oQueFazer: string }> = {
  Cpf: {
    alerta: 'Tem um CPF no texto.',
    riscoReal: 'Com o CPF, golpistas fingem ser do banco ou do INSS, abrem contas e pedem empréstimos no nome da pessoa.',
    oQueFazer: 'Apague o número antes de levar a memória ao mapa. Banco e INSS nunca pedem CPF por telefone ou WhatsApp.',
  },
  Senha: {
    alerta: 'Tem uma senha no texto.',
    riscoReal: 'Senha publicada é acesso direto ao banco, ao celular ou ao aplicativo da pessoa.',
    oQueFazer: 'Apague a senha do texto. Depois, troque essa senha hoje mesmo: ninguém do bairro precisa saber.',
  },
  Telefone: {
    alerta: 'Tem um número de telefone no texto.',
    riscoReal: 'Com o telefone, golpistas ligam ou mandam mensagem fingindo ser um neto, o banco ou a farmácia.',
    oQueFazer: 'Apague o número. Quem quiser falar com a família pode usar o próprio Me Conta.',
  },
  Saude: {
    alerta: 'O texto fala da saúde da pessoa.',
    riscoReal:
      'Dado de saúde é sensível pela LGPD. Publicado, atrai golpes de falsos planos de saúde, remédios milagrosos e consultas falsas.',
    oQueFazer: 'Combine com a pessoa idosa se ela quer contar isso ao bairro. Dá para guardar a memória sem citar a doença ou o remédio.',
  },
  Endereco: {
    alerta: 'O texto mostra onde a pessoa mora.',
    riscoReal: 'Rua e número no mapa mostram a casa da pessoa e facilitam visitas de golpistas e furtos.',
    oQueFazer: 'Deixe só o nome do bairro. A memória continua bonita sem a rua e o número.',
  },
  Vulnerabilidade: {
    alerta: 'O texto conta a rotina da casa.',
    riscoReal: 'Dizer que a pessoa mora sozinha, a que horas sai ou onde guarda dinheiro avisa quem quer aplicar golpe ou furtar.',
    oQueFazer: 'Tire do texto quando a pessoa fica sozinha, onde guarda dinheiro e como é a segurança da casa.',
  },
};

/** Minúsculas e sem acento, com o mesmo tamanho do texto original (as posições continuam valendo). */
function normalizar(texto: string): string {
  return texto
    .normalize('NFC')
    .split('')
    .map((letra) => letra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 1) || letra)
    .join('');
}

function mascarar(trecho: string, estilo: Regra['mascara']): string {
  switch (estilo) {
    case 'digitos': {
      const total = trecho.replace(/\D/g, '').length;
      let vistos = 0;
      // Mostra só os dois últimos dígitos, como a API.
      return trecho.replace(/\d/g, (digito) => {
        vistos += 1;
        return vistos > total - 2 ? digito : '*';
      });
    }
    case 'total':
      return '******';
    case 'palavras':
      return trecho.replace(/\S+/g, (palavra) => `${palavra[0] ?? ''}${'*'.repeat(Math.max(0, palavra.length - 1))}`);
  }
}

type Encontrado = Achado & { inicio: number; fim: number; substituicao: string };

function verificarCampo(texto: string, campo: string): Encontrado[] {
  const normalizado = normalizar(texto);
  const achados: Encontrado[] = [];
  for (const regra of REGRAS) {
    for (const casou of normalizado.matchAll(regra.padrao)) {
      const inicio = casou.index;
      const fim = inicio + casou[0].length;
      const original = texto.slice(inicio, fim);
      if (regra.valida && !regra.valida(original)) {
        continue;
      }
      // Um trecho já marcado por uma regra mais grave não conta duas vezes.
      if (achados.some((a) => inicio < a.fim && fim > a.inicio)) {
        continue;
      }
      achados.push({
        regraId: `DEMO-${regra.tipo.toUpperCase()}`,
        tipo: regra.tipo,
        rotulo: regra.rotulo,
        nivel: regra.nivel,
        campo,
        trechoMascarado: mascarar(original, regra.mascara),
        explicacao: EXPLICACOES[regra.tipo]?.riscoReal ?? '',
        inicio,
        fim,
        substituicao: regra.substituicao,
      });
    }
  }
  return achados;
}

function textoSeguro(texto: string, achados: readonly Encontrado[]): string {
  return [...achados]
    .sort((a, b) => b.inicio - a.inicio)
    .reduce((atual, achado) => atual.slice(0, achado.inicio) + achado.substituicao + atual.slice(achado.fim), texto);
}

function semPosicoes(achado: Encontrado): Achado {
  const { inicio: _i, fim: _f, substituicao: _s, ...publico } = achado;
  return publico;
}

export function analisarTexto(paginaId: number, titulo: string, transcricao: string | null): AnalisePrivacidade {
  const doTitulo = verificarCampo(titulo, 'Titulo');
  const daTranscricao = transcricao ? verificarCampo(transcricao, 'Transcricao') : [];
  const todos = [...doTitulo, ...daTranscricao];

  const altos = todos.filter((a) => a.nivel === 'Alto').length;
  const medios = todos.length - altos;
  const indice = Math.min(100, altos * 65 + medios * 30);
  const faixa: NivelDeRisco = indice >= 60 ? 'Alto' : indice >= 30 ? 'Medio' : 'Baixo';
  const bloqueada = altos > 0;
  const exigeConfirmacao = !bloqueada && medios > 0;
  const resultado: ResultadoDaAnalise = bloqueada ? 'Bloqueada' : exigeConfirmacao ? 'PrecisaConfirmar' : 'Liberada';

  return {
    paginaId,
    resultado,
    indiceRiscoCidadao: indice,
    faixa,
    bloqueada,
    exigeConfirmacao,
    achados: todos.map(semPosicoes),
    versaoSegura: {
      titulo: textoSeguro(titulo, doTitulo),
      transcricao: transcricao ? textoSeguro(transcricao, daTranscricao) : null,
    },
  };
}

export function explicarAnalise(analise: AnalisePrivacidade): ExplicacaoDeRisco {
  const porTipo = new Map<string, AlertaDeRisco>();
  for (const achado of analise.achados) {
    const texto = EXPLICACOES[achado.tipo];
    const atual = porTipo.get(achado.tipo);
    if (atual) {
      atual.trechos.push(achado.trechoMascarado);
      continue;
    }
    porTipo.set(achado.tipo, {
      rotulo: achado.rotulo,
      nivel: achado.nivel,
      trechos: [achado.trechoMascarado],
      alerta: texto?.alerta ?? 'Tem um dado pessoal no texto.',
      riscoReal: texto?.riscoReal ?? achado.explicacao,
      oQueFazer: texto?.oQueFazer ?? 'Apague o dado antes de publicar.',
    });
  }
  const resumo =
    analise.resultado === 'Bloqueada'
      ? 'Esta memória tem um dado que não pode ir para o mapa do bairro.'
      : analise.resultado === 'PrecisaConfirmar'
        ? 'Esta memória conta algo pessoal. Confirme com a pessoa idosa antes de publicar.'
        : 'Nada pessoal encontrado. A memória pode ir para o mapa do bairro.';
  return {
    paginaId: analise.paginaId,
    resultado: analise.resultado,
    indiceRiscoCidadao: analise.indiceRiscoCidadao,
    faixa: analise.faixa,
    resumo,
    alertas: [...porTipo.values()],
    versaoSugerida: analise.achados.length > 0 ? (analise.versaoSegura.transcricao ?? analise.versaoSegura.titulo) : null,
    fonte: 'Local (demonstração)',
  };
}
