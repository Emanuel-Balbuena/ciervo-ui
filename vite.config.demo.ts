import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Configuración exclusiva para la página web (Demo)
export default defineConfig({
    plugins: [vue()],
    base: '/ciervo-ui/',
    build: {
        outDir: 'dist-demo'
    }
});