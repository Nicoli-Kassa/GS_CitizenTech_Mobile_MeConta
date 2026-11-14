# Me Conta · App

> O app que troca o 👍 da família por uma pergunta que só os avós sabem responder.

App mobile do **Me Conta** (Global Solution FIAP 2026 · CitizenTech), feito em **React Native + Expo + TypeScript + Expo Router**. O app é um caderno de família: cada resposta em áudio dos avós vira uma página, que se vira com o dedo.

> README em construção. A versão completa (Ficha da CitizenTech, telas, prints e vídeo) entra na entrega final.

## Como rodar

Pré-requisitos: Node.js 20+ e o app **Expo Go** atualizado no celular (SDK 58).

```bash
npm install
npm run start:clean      # expo start -c com mais memória para o Metro
```

Escaneie o QR code com o Expo Go, com o celular na mesma rede Wi-Fi do PC. Se a rede bloquear a conexão, use `npx expo start --tunnel`.

### Dados de demonstração ou API

- **Sem configurar nada**, o app usa os **dados de demonstração** (Família Souza, Vó Lourdes e Vô Antônio, todos fictícios). Eles seguem as mesmas regras e mensagens de erro da API.
- **Com a API** ([me-conta-api](https://github.com/Nicoli-Kassa/GS-CitizenTech_CSharpSOA_MeConta)): copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_API_URL` com o IP do PC (instruções no próprio arquivo).

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run start:clean` | Sobe o Metro limpando o cache |
| `npm run typecheck` | Confere os tipos (`tsc --noEmit`) |
| `npm run lint` | Lint do Expo |
| `npm run web` | Versão web, só para pré-visualizar |
