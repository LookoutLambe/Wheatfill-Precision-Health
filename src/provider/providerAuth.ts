const KEY = 'wph_provider_authed_v1'
const EVENT = 'wph_provider_auth_changed'
const PASS_KEY = 'wph_provider_password_v1'

const DEFAULT_USERNAME = 'brett'
const DEFAULT_PASSWORD = 'wheatfill'

export function isProviderAuthed() {
  return localStorage.getItem(KEY) === 'true'
}

export function setProviderAuthed(next: boolean) {
  localStorage.setItem(KEY, next ? 'true' : 'false')
  window.dispatchEvent(new Event(EVENT))
}

export function getProviderUsername() {
  return DEFAULT_USERNAME
}

export function getProviderPassword() {
  const saved = localStorage.getItem(PASS_KEY)
  return saved && saved.trim() ? saved : DEFAULT_PASSWORD
}

export function setProviderPassword(nextPassword: string) {
  localStorage.setItem(PASS_KEY, nextPassword)
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeProviderAuth(cb: () => void) {
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === PASS_KEY) cb()
  }
  window.addEventListener(EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

