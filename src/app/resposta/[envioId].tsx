import React from 'react';

import { EmBreve } from '../../components/EmBreve';

/** Guardar o áudio da resposta como página do caderno (US08). Chega na Etapa 2. */
export default function RespostaScreen(): React.JSX.Element {
  return (
    <EmBreve
      titulo="Guardar a resposta"
      texto="Aqui você vai escolher o áudio do WhatsApp, uma foto e o título da página."
    />
  );
}
