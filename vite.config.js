import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/0x4F776C.github.io/',
  define: {
    'window.GITHUB_TOKEN': JSON.stringify(process.env.GITHUB_TOKEN || '')
  }
})