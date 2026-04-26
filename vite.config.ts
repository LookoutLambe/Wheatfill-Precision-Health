import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  define: {
    __WPH_BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  // Production (GitHub Pages): custom domain uses site root. Dev stays at /.
  base: command === 'serve' ? '/' : '/',
}))
