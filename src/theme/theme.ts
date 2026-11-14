/**
 * Tokens visuais do Me Conta: papel amarelado, tinta marrom e capa de tecido.
 *
 * Todos os pares de texto e fundo usados no app têm contraste de pelo menos
 * 4,5:1 (WCAG 2.1 AA). Os valores medidos estão ao lado de cada cor.
 */

export const colors = {
  /** Mesa onde o caderno fica apoiado. */
  mesa: '#2B211C',
  /** Folha do caderno. Tinta sobre papel: 11,3:1. */
  papel: '#F4E8CC',
  papelEscuro: '#E7D5AE',
  /** Linhas pautadas e bordas finas (decorativas, sem texto). */
  pauta: '#D9C29A',
  kraft: '#D4B483',
  /** Texto principal. */
  tinta: '#3A2A1E',
  /** Texto secundário. Sobre papel: 6,5:1. Não usar sobre kraft. */
  tintaSuave: '#6A4B33',
  /** Texto claro sobre tinta, capa e abas escuras. Sobre tinta: 12,5:1. */
  creme: '#FBF4E2',
  /** Capa de tecido. Título dourado sobre a capa: 7,2:1. */
  capa: '#6E2F25',
  capaEscura: '#4E1F18',
  dourado: '#F1D9A0',
  /** Fita adesiva (washi), semitransparente sobre a foto. */
  fita: 'rgba(233, 216, 166, 0.82)',
  sombra: '#000000',
  /** Erro: vermelho-tijolo. Sobre papel: 6,1:1. */
  erro: '#9C2F1F',
  sucesso: '#3E6B34',
} as const;

/**
 * Cor de cada categoria (abas do caderno). `texto` é a cor da letra na aba,
 * escolhida para passar de 4,5:1 (creme nas escuras, tinta na mostarda).
 */
export const categoriaCores: Record<string, { fundo: string; texto: string }> = {
  receitas: { fundo: '#A8432C', texto: colors.creme },
  'historia-da-familia': { fundo: '#4E6B3F', texto: colors.creme },
  oficios: { fundo: '#2F5B7C', texto: colors.creme },
  'o-bairro': { fundo: '#E0B04A', texto: colors.tinta },
  conselhos: { fundo: '#76406B', texto: colors.creme },
};

export const corPadraoCategoria = { fundo: colors.tintaSuave, texto: colors.creme } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/**
 * Tamanhos maiores que o padrão de apps comuns: o texto do corpo começa em 17.
 * Todos acompanham a fonte do sistema (até 200%), sem altura fixa nos textos.
 */
export const fontSize = {
  sm: 15,
  md: 17,
  lg: 20,
  xl: 26,
  manuscritoMd: 28,
  manuscritoLg: 36,
  manuscritoXl: 46,
} as const;

/**
 * Três vozes de letra:
 * - manuscrita (Caveat): só títulos grandes, como quem escreve no caderno;
 * - livro (Lora): todo texto que precisa ser lido com conforto;
 * - máquina de escrever (Special Elite): datas e etiquetas curtas.
 */
export const fonts = {
  manuscrita: 'Caveat_700Bold',
  livro: 'Lora_400Regular',
  livroItalico: 'Lora_400Regular_Italic',
  livroNegrito: 'Lora_700Bold',
  maquina: 'SpecialElite_400Regular',
} as const;

/** Área mínima de toque (WCAG e Material): 48 dp. Os botões principais usam 56. */
export const toqueMinimo = 48;

export const texturas = {
  papel: require('../../assets/texturas/papel.png') as number,
  kraft: require('../../assets/texturas/kraft.png') as number,
  capa: require('../../assets/texturas/capa.png') as number,
  mesa: require('../../assets/texturas/mesa.png') as number,
};
