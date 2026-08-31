import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'Ciervo UI',
      fileName: (format) => `ciervo-ui.${format}.js`
    },
    rollupOptions: {
      external: ['vue', 'cuelume'],
      output: {
        globals: {
          vue: 'Vue',
          cuelume: 'cuelume'
        }
      }
    }
  }
});