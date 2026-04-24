import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MedplumAppProvider } from './medplum/provider'

const MARKETING_ONLY = (import.meta.env.VITE_MARKETING_ONLY?.toString().trim() || '') === '1'

// Marketing static site: never use a service worker (stale index/asset paths → white screen after domain/base changes).
// Full app production: register after load.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  if (MARKETING_ONLY) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      void Promise.all(regs.map((r) => r.unregister()))
    })
  } else {
    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`
      navigator.serviceWorker.register(swUrl).catch(() => {})
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <MedplumAppProvider>
        <App />
      </MedplumAppProvider>
    </BrowserRouter>
  </StrictMode>,
)
