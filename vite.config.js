import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/0x4F776C.github.io/',
  resolve: {
    alias: {
      '@': '/src',
      'vue': '/node_modules/vue/dist/vue.esm-bundler.js'
    }
  },
  define: {
    'window.GITHUB_TOKEN': JSON.stringify(process.env.GITHUB_TOKEN || '')
  }
});