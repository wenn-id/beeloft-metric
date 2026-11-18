import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const isGhPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGhPages ? '/beeloft-metric/' : '/',
  plugins: [vue()],
  define: isGhPages ? { 'import.meta.env.VITE_STATIC_API': JSON.stringify('true') } : {},
  build: {
    outDir: isGhPages ? 'docs' : 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '^/api/': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      },
      '^/s(?:/|$)': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      },
      '^/p$': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      },
      '^/tracker\\.js$': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true
      }
    }
  }
});
