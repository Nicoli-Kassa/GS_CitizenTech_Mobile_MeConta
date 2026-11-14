import React from 'react';

import { EmBreve } from '../components/EmBreve';

/** Nossa família: idosos, convite, painel e "Ensine sua avó". Chega na Etapa 3. */
export default function FamiliaScreen(): React.JSX.Element {
  return (
    <EmBreve
      titulo="Nossa família"
      texto="Aqui vão ficar as fotos dos avós, o convite para a família e o modo Ensine sua avó."
    />
  );
}
