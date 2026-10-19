import { defineConfig } from 'vite';

// base './': rutas relativas, para que dist/ funcione igual en Pages (/<deck>/) que sin internet.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 1200 },
});
