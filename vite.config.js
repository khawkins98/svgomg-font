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
});
