// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Ignora as pastas de build nativo.
 *
 * Com `npx expo run:android`, o Gradle cria e apaga arquivos em
 * `node_modules/<pacote>/android/build/`, e o watcher do Metro cai com
 * `ENOENT: watch`. A regex cobre `/` e `\` por causa do Windows.
 */
config.resolver.blockList = /[\\/]android[\\/](app[\\/])?(build|\.gradle|\.cxx)[\\/]/;

/**
 * Versão web (só para pré-visualizar no navegador): o expo-sqlite usa
 * WebAssembly e SharedArrayBuffer, que exigem o arquivo .wasm e os
 * cabeçalhos de isolamento abaixo. No celular nada disso é usado.
 */
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
