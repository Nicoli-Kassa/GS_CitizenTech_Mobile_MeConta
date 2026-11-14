import React from 'react';

import { EmBreve } from '../components/EmBreve';

/** Escolher e enviar uma pergunta (US04 a US07). Chega na Etapa 2. */
export default function PerguntarScreen(): React.JSX.Element {
  return (
    <EmBreve
      titulo="Perguntar"
      texto="Aqui vai aparecer a pergunta da semana num bilhete, as perguntas por categoria e o envio pelo WhatsApp."
    />
  );
}
