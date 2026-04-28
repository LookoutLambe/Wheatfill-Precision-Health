import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Production: register the app shell SW so Chrome on Android can treat the site as an installable PWA
// (manifest + SW + HTTPS). Bump CACHE in public/sw.js after hosting or asset-path changes to avoid stale shells.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Cache-bust SW URL each deploy so PWA doesn't stick on old shells.
    const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${__WPH_BUILD_ID__}`.replace(/\/{2,}/g, '/')
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
