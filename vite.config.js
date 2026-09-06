import { defineConfig } from 'vite';

export default defineConfig({
  base: '/svgomg-font/',
  server: {
    port: 5180,
    open: true,
  },
  build: {
    target: 'es2020',
  },
  // `subsetFont.js` uses DOMParser to extract codepoints from the SVG.
  // Vitest defaults to a Node env with no DOM, so the tests for that
  // module need happy-dom (bundled with jsdom-like APIs, tiny footprint).
  test: {
    environment: 'happy-dom',
  },
});
