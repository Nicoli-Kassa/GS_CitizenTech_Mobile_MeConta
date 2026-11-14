import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors } from '../theme/theme';

/**
 * Desenhos a traço, um por categoria. Aparecem no lugar da foto quando a
 * página não tem foto, como um esboço feito à mão no caderno.
 */

type IlustracaoProps = {
  categoriaSlug: string | null;
  largura: number;
  cor?: string;
};

const T = { stroke: colors.tintaSuave, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

export function Ilustracao({ categoriaSlug, largura, cor = colors.tintaSuave }: IlustracaoProps): React.JSX.Element {
  const traco = { ...T, stroke: cor };
  return (
    <Svg width={largura} height={largura * 0.75} viewBox="0 0 120 90">
      {(() => {
        switch (categoriaSlug) {
          case 'receitas':
            return (
              <>
                <Ellipse cx="60" cy="72" rx="40" ry="6" {...traco} />
                <Path d="M30 68 C30 52 31 44 32 40 L88 40 C89 46 90 54 90 68" {...traco} />
                <Path d="M31 52 C45 56 75 56 89 52" {...traco} />
                <Path d="M32 40 C40 34 52 33 60 33 C70 33 82 35 88 40" {...traco} />
                <Path d="M44 38 C46 42 48 42 50 38 M62 37 C64 41 66 41 68 37 M76 38 C78 42 80 42 82 38" {...traco} />
                <Path d="M52 24 C48 18 56 14 52 8 M62 24 C58 18 66 14 62 8 M72 24 C68 18 76 14 72 8" {...traco} />
              </>
            );
          case 'historia-da-familia':
            return (
              <>
                <Circle cx="50" cy="52" r="18" {...traco} />
                <Circle cx="70" cy="52" r="18" {...traco} />
                <Path d="M47 34 L50 28 L53 34" {...traco} />
                <Path d="M60 22 C56 14 46 18 52 26 L60 33 L68 26 C74 18 64 14 60 22 Z" {...traco} />
                <Path d="M22 80 C40 76 80 76 98 80" {...traco} />
              </>
            );
          case 'oficios':
            return (
              <>
                <Rect x="30" y="22" width="34" height="8" rx="2" {...traco} />
                <Rect x="30" y="66" width="34" height="8" rx="2" {...traco} />
                <Path d="M34 30 L34 66 M60 30 L60 66" {...traco} />
                <Path d="M34 36 L60 40 M34 44 L60 48 M34 52 L60 56 M34 60 L60 62" {...traco} />
                <Path d="M60 44 C76 40 84 52 92 64" {...traco} />
                <Path d="M84 18 L98 76" {...traco} />
                <Ellipse cx="85.5" cy="23" rx="2" ry="4" transform="rotate(-14 85.5 23)" {...traco} />
              </>
            );
          case 'o-bairro':
            return (
              <>
                <Path d="M12 78 L108 78" {...traco} />
                <Path d="M18 78 L18 46 L34 32 L50 46 L50 78" {...traco} />
                <Rect x="27" y="58" width="12" height="20" {...traco} />
                <Path d="M56 78 L56 50 L72 38 L88 50 L88 78" {...traco} />
                <Rect x="63" y="56" width="10" height="9" {...traco} />
                <Path d="M100 78 L100 30 M94 30 L106 30 M100 30 C104 34 104 38 100 40" {...traco} />
                <Path d="M60 22 C66 16 74 16 78 20 M84 14 C88 10 94 10 96 14" {...traco} />
              </>
            );
          case 'conselhos':
            return (
              <>
                <Path d="M50 78 L70 78 M54 78 L54 46 L66 46 L66 78" {...traco} />
                <Path d="M60 46 L60 40" {...traco} />
                <Path d="M60 38 C52 30 56 20 60 14 C64 20 68 30 60 38 Z" {...traco} />
                <Path d="M38 26 L44 30 M82 26 L76 30 M34 42 L42 42 M86 42 L78 42" {...traco} />
                <Path d="M40 82 C50 80 70 80 80 82" {...traco} />
              </>
            );
          default:
            return (
              <>
                <Path d="M30 70 C40 40 80 40 90 70" {...traco} />
                <Circle cx="60" cy="34" r="10" {...traco} />
              </>
            );
        }
      })()}
    </Svg>
  );
}
