const USER_KEY = 'wph_patient_current_v1'
const USERS_KEY = 'wph_patient_users_v1'
const EVENT = 'wph_patient_auth_changed'

export type PatientUser = {
  username: string
  password: string
  displayName: string
  createdAt: string
}

function readUsers(): PatientUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PatientUser[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeUsers(next: PatientUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(next))
}

export function getCurrentPatientUsername() {
  return localStorage.getItem(USER_KEY) || ''
}

export function isPatientAuthed() {
  return !!getCurrentPatientUsername()
}

export function getCurrentPatient() {
  const u = getCurrentPatientUsername()
  if (!u) return null
  return readUsers().find((x) => x.username === u) || null
}

export function setCurrentPatientUsername(username: string) {
  localStorage.setItem(USER_KEY, username)
  window.dispatchEvent(new Event(EVENT))
}

export function logoutPatient() {
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event(EVENT))
}

export function createPatientAccount(input: {
  username: string
  password: string
  displayName: string
}) {
  const username = input.username.trim().toLowerCase()
  const users = readUsers()
  if (users.some((u) => u.username === username)) {
    return { ok: false as const, reason: 'Username already exists.' }
  }
  if (input.password.length < 6) {
    return { ok: false as const, reason: 'Password must be at least 6 characters.' }
  }
  const user: PatientUser = {
    username,
    password: input.password,
    displayName: input.displayName.trim() || username,
    createdAt: new Date().toISOString(),
  }
  writeUsers([user, ...users])
  setCurrentPatientUsername(user.username)
  return { ok: true as const, user }
}

export function loginPatient(input: { username: string; password: string }) {
  const username = input.username.trim().toLowerCase()
  const users = readUsers()
  const found = users.find((u) => u.username === username)
  if (!found || found.password !== input.password) {
    return { ok: false as const, reason: 'Invalid username or password.' }
  }
  setCurrentPatientUsername(found.username)
  return { ok: true as const, user: found }
}

export function subscribePatientAuth(cb: () => void) {
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === USER_KEY || e.key === USERS_KEY) cb()
  }
  window.addEventListener(EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

