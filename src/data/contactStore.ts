export type ContactMessage = {
  id: string
  name: string
  email: string
  message: string
  createdAt: string
}

const KEY = 'wph_contact_messages_v1'
const EVENT = 'wph_contact_messages_changed'

function uid() {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
  return `msg_${rand}`
}

function readAll(): ContactMessage[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ContactMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(next: ContactMessage[]) {
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

export function getMessages() {
  return readAll()
}

export function subscribeMessages(cb: () => void) {
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

export function addMessage(input: { name: string; email: string; message: string }) {
  const prev = readAll()
  const msg: ContactMessage = {
    id: uid(),
    name: input.name.trim(),
    email: input.email.trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  }
  writeAll([msg, ...prev])
  return msg
}

export function clearMessages() {
  writeAll([])
}

