import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  define: {
    'window.GITHUB_TOKEN': JSON.stringify(process.env.GITHUB_TOKEN || '')
  }
})