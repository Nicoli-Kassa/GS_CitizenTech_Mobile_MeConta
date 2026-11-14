import type { Categoria, Pergunta } from '../../types/api';

/**
 * Catálogo inicial, igual ao que a API grava na migração.
 * Vai junto com o app para as perguntas funcionarem sem internet desde o
 * primeiro uso (US04).
 */

export const CATEGORIAS: readonly Categoria[] = [
  { id: 1, slug: 'receitas', nome: 'Receitas' },
  { id: 2, slug: 'historia-da-familia', nome: 'História da família' },
  { id: 3, slug: 'oficios', nome: 'Ofícios' },
  { id: 4, slug: 'o-bairro', nome: 'O bairro' },
  { id: 5, slug: 'conselhos', nome: 'Conselhos' },
];

const TEXTOS: readonly [number, number, string][] = [
  [1, 1, 'Qual é o segredo do seu prato mais famoso?'],
  [2, 1, 'Que receita você aprendeu com a sua mãe ou a sua avó?'],
  [3, 1, 'O que não podia faltar na mesa nas festas de fim de ano?'],
  [4, 1, 'Qual doce você fazia quando alguém da família fazia aniversário?'],
  [5, 1, 'Qual comida te lembra a sua infância?'],
  [6, 2, 'Como você conheceu o amor da sua vida?'],
  [7, 2, 'Como eram os seus pais quando você era criança?'],
  [8, 2, 'De onde veio a nossa família antes de chegar aqui?'],
  [9, 2, 'Qual é a história mais engraçada que aconteceu na nossa família?'],
  [10, 2, 'Como foi o dia em que você saiu da casa dos seus pais?'],
  [11, 3, 'Qual foi o seu primeiro trabalho e o que você fazia lá?'],
  [12, 3, 'Que ofício você sabe fazer que quase ninguém mais faz?'],
  [13, 3, 'Quem te ensinou a profissão que você teve?'],
  [14, 3, 'Qual foi o dia mais marcante no seu trabalho?'],
  [15, 3, 'Que ferramenta ou máquina você usava todo dia no trabalho?'],
  [16, 4, 'Como era o bairro quando você chegou?'],
  [17, 4, 'Qual loja ou padaria do bairro já não existe mais?'],
  [18, 4, 'Como eram as festas juninas na sua rua?'],
  [19, 4, 'Onde as crianças brincavam no bairro quando você era jovem?'],
  [20, 4, 'Qual era o nome antigo de alguma rua daqui?'],
  [21, 5, 'Qual foi o melhor conselho que você já recebeu?'],
  [22, 5, 'O que você gostaria de ter sabido aos 20 anos?'],
  [23, 5, 'Que conselho você daria para quem está começando a trabalhar?'],
  [24, 5, 'Como você fazia para economizar quando as coisas estavam difíceis?'],
  [25, 5, 'O que é mais importante para manter uma família unida?'],
];

export const PERGUNTAS_DO_CATALOGO: readonly Pergunta[] = TEXTOS.map(([id, categoriaId, texto]) => ({
  id,
  texto,
  categoriaId,
  tipo: 'Catalogo',
  jaPerguntada: false,
}));
