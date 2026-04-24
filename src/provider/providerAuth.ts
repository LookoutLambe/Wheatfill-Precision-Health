const KEY = 'wph_provider_authed_v1'
const EVENT = 'wph_provider_auth_changed'

export function isProviderAuthed() {
  return localStorage.getItem(KEY) === 'true'
}

export function setProviderAuthed(next: boolean) {
  localStorage.setItem(KEY, next ? 'true' : 'false')
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeProviderAuth(cb: () => void) {
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb()
  }
  window.addEventListener(EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

