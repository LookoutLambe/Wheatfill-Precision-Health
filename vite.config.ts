import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from /<repo-name>/
  // Keep dev served from / to avoid confusing local URLs.
  base: command === 'serve' ? '/' : '/Wheatfill-Precision-Health/',
}))
