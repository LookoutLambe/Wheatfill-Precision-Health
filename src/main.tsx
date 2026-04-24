import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MedplumAppProvider } from './medplum/provider'

// Only register the service worker in production builds.
// In dev, a SW can cache/serve stale HTML and make routes look "blank".
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(swUrl).catch(() => {})
  })
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
