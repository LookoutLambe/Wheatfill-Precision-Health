import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Production (GitHub Pages): custom domain uses site root. Dev stays at /.
  base: command === 'serve' ? '/' : '/',
}))
