# Uso de IA generativa no app do Me Conta

Registro do uso de IA (Claude, da Anthropic) no desenvolvimento do app mobile. Todas as decisões de produto, de experiência e de escopo foram minhas. A IA ajudou a planejar, escrever e revisar o código. Revisei o código e sei explicar cada parte.

## Como a IA foi usada

| Etapa | O que pedi | O que a IA fez | O que eu decidi ou ajustei |
|---|---|---|---|
| Plano | Ler o brief da GS, o backlog e a API, e propor um plano para o app. | Propôs as telas, a camada de dados (contrato com duas implementações: API e demonstração) e o banco SQLite sem internet. | Defini o escopo por PBI e o prazo. |
| Direção de UX | A partir do meu documento de referências (caderno de argolas, scrapbook, app Paper), propor como seria o app. | Transformou as referências num conceito: o caderno como tela inicial, abas coloridas por assunto, a pergunta como página em branco esperando a resposta. | Escolhi a estética de papel e recordação, sem abas nem ícones genéricos. Pedi que fosse fácil também para idosos. |
| Etapa 0 | Montar o projeto, o tema e o caderno que vira as páginas. | Escreveu o tema (com o contraste medido), as texturas geradas por script, os componentes do caderno e a animação de virar a página. | Testei o gesto e as animações no Expo Go. |
| Integração com a API | Atualizar o app com as rotas novas de IoT e Cybersecurity. | Leu os DTOs e controllers da API e escreveu os tipos, o cliente HTTP (com renovação do token), a fila de sincronização e as telas novas. | Conferi as rotas no Swagger da API. |
| Jornada principal | Perguntar, enviar pelo WhatsApp, guardar a resposta, família, bairro, Ensine sua avó. | Escreveu as telas e as regras espelhadas da API (telefone, filtro contra golpes, pergunta da semana). | Revisei os textos de cada tela para ficarem simples e diretos. |
| Verificação | Conferir se tudo funciona. | Rodou `tsc`, o lint e a exportação Android, e percorreu a jornada inteira na versão web com testes automáticos, tirando os prints. | Os testes no celular, com a API ligada, ficaram comigo. |
| Documentação | README com a Ficha, telas e prints. | Escreveu este README e este registro. | Revisei e completei os links. |

## Cuidados

- **Dados de demonstração:** a família usa só os primeiros nomes da neta (Nicoli) e da avó (Laura). Sobrenome, telefones, e-mails e histórias são fictícios. O CPF da página de demonstração é um número de teste.
- **Sem imagens de terceiros:** as texturas, os ícones, as ilustrações e a melodia de demonstração foram gerados para o projeto.
- **A IA do app (Gemini) fica na API:** o app nunca fala direto com o Gemini. Ele só mostra a explicação que a API devolve, e a API só manda para a IA o texto já mascarado.
