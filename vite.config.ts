import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CiervoUI',
      fileName: (format) => `ciervo-ui.${format}.js`,
      cssFileName: 'ciervo-ui'
    },
    rollupOptions: {
      external: ['vue', 'cuelume'],
      output: {
        globals: {
          vue: 'Vue',
          cuelume: 'cuelume'
        },
        exports: 'named'
      }
    }
  }
});