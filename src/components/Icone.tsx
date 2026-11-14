import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../theme/theme';

/**
 * Ícones desenhados para o Me Conta, com traço de caneta (pontas
 * arredondadas e linhas um pouco tortas), no lugar de ícones genéricos.
 * São sempre decorativos: o texto do botão diz o que ele faz.
 */

export type NomeIcone =
  | 'pena'
  | 'familia'
  | 'ouvir'
  | 'pausar'
  | 'anterior'
  | 'proxima'
  | 'envelope'
  | 'fechar'
  | 'nuvem'
  | 'relogio';

type IconeProps = {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
};

const TRACO = { strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export function Icone({ nome, tamanho = 26, cor = colors.tinta }: IconeProps): React.JSX.Element {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 32 32">
      {desenho(nome, cor)}
    </Svg>
  );
}

function desenho(nome: NomeIcone, cor: string): React.JSX.Element {
  switch (nome) {
    case 'pena':
      return (
        <>
          <Path d="M26.5 4.5c-8 1.2-14.6 7.4-17.3 16.6l-1.6 6.3" stroke={cor} {...TRACO} />
          <Path d="M26.5 4.5c.6 7.7-5.3 14.4-14.7 16.3" stroke={cor} {...TRACO} />
          <Path d="M13.8 15.2l5.6.4M16.6 11.4l5.2.2" stroke={cor} {...TRACO} />
          <Path d="M4.5 28.2c2.4-.8 4.6-.6 7 .3" stroke={cor} {...TRACO} />
        </>
      );
    case 'familia':
      return (
        <>
          <Circle cx="11" cy="9.5" r="3.6" stroke={cor} {...TRACO} />
          <Circle cx="22" cy="11.5" r="3" stroke={cor} {...TRACO} />
          <Path d="M4.6 26.6c.3-5.4 2.9-8.6 6.5-8.6s6.1 3.1 6.4 8.4" stroke={cor} {...TRACO} />
          <Path d="M16.9 20.1c1.2-2.1 3-3.2 5.1-3.2 3 0 5 2.6 5.3 7.4" stroke={cor} {...TRACO} />
        </>
      );
    case 'ouvir':
      return <Path d="M10.4 6.6c-.3 6.4-.2 12.6.2 18.8 5.6-2.8 10.8-6 15.6-9.6-5.1-3.4-10.4-6.5-15.8-9.2z" stroke={cor} {...TRACO} fill={cor} />;
    case 'pausar':
      return (
        <>
          <Path d="M11.2 7.2c-.2 6-.1 11.8.3 17.6" stroke={cor} {...TRACO} strokeWidth={4} />
          <Path d="M20.6 7c.2 6 .1 11.9-.3 17.8" stroke={cor} {...TRACO} strokeWidth={4} />
        </>
      );
    case 'anterior':
      return <Path d="M19.6 6.4c-3.6 3.1-6.9 6.3-9.8 9.8 3 3.2 6.2 6.4 9.7 9.4" stroke={cor} {...TRACO} strokeWidth={2.8} />;
    case 'proxima':
      return <Path d="M12.4 6.4c3.6 3.1 6.9 6.3 9.8 9.8-3 3.2-6.2 6.4-9.7 9.4" stroke={cor} {...TRACO} strokeWidth={2.8} />;
    case 'envelope':
      return (
        <>
          <Path d="M4.8 9.2c7.5-.4 15-.4 22.4 0 .4 4.6.4 9.2 0 13.8-7.4.5-14.9.5-22.4 0-.4-4.6-.4-9.2 0-13.8z" stroke={cor} {...TRACO} />
          <Path d="M5.2 9.6c3.4 3 7 5.4 10.8 7.2 3.8-1.8 7.4-4.2 10.8-7.2" stroke={cor} {...TRACO} />
        </>
      );
    case 'fechar':
      return (
        <>
          <Path d="M7.6 7.8c5.4 5.2 11 10.8 16.6 16.6" stroke={cor} {...TRACO} strokeWidth={2.8} />
          <Path d="M24.4 7.6c-5.6 5.6-11.2 11.2-16.8 16.8" stroke={cor} {...TRACO} strokeWidth={2.8} />
        </>
      );
    case 'nuvem':
      return (
        <Path
          d="M9.4 23.6c-3 0-5-2-5-4.6 0-2.5 2-4.4 4.6-4.4.5-3.6 3.4-6.2 7-6.2 3.2 0 5.9 2.1 6.7 5.2 2.9.1 5 2.3 5 5 0 2.8-2.2 5-5.2 5H9.4z"
          stroke={cor}
          {...TRACO}
        />
      );
    case 'relogio':
      return (
        <>
          <Circle cx="16" cy="16" r="10.5" stroke={cor} {...TRACO} />
          <Path d="M16 9.6v6.8l4.4 2.6" stroke={cor} {...TRACO} />
        </>
      );
  }
}
