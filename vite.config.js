import { defineConfig } from 'vite';

// A relative base makes the build work from any GitHub Pages project URL
// (https://<user>.github.io/<repo>/) without hard-coding the repository name.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 400,
  },
});
