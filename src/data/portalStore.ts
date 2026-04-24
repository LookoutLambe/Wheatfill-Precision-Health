export type AppointmentType = 'New Patient Consultation' | 'Follow-Up Consultation'
export type AppointmentStatus = 'Requested' | 'Scheduled' | 'Completed'

export type OrderCategory = 'GLP-1' | 'Labs' | 'Supplements' | 'Other'
export type OrderStatus = 'New' | 'In Review' | 'Ordered' | 'Closed'

export type AppointmentRequest = {
  id: string
  patientName: string
  type: AppointmentType
  preferredDate: string
  preferredTime: string
  notes: string
  status: AppointmentStatus
  createdAt: string
  scheduledDate?: string
  scheduledTime?: string
}

export type OrderRequest = {
  id: string
  patientName: string
  category: OrderCategory
  request: string
  status: OrderStatus
  createdAt: string
}

type PortalState = {
  appointments: AppointmentRequest[]
  orders: OrderRequest[]
}

const STORAGE_KEY = 'wph_portal_state_v1'
const EVENT_NAME = 'wph_portal_state_changed'

function nowIso() {
  return new Date().toISOString()
}

function uid(prefix: string) {
  // crypto.randomUUID() is available in modern browsers; fallback included.
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
  return `${prefix}_${rand}`
}

function readState(): PortalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { appointments: [], orders: [] }
    const parsed = JSON.parse(raw) as PortalState
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    }
  } catch {
    return { appointments: [], orders: [] }
  }
}

function writeState(next: PortalState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function getPortalState(): PortalState {
  return readState()
}

export function subscribePortalState(cb: () => void) {
  const onLocal = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb()
  }
  window.addEventListener(EVENT_NAME, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT_NAME, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

export function createAppointmentRequest(input: {
  patientName: string
  type: AppointmentType
  preferredDate: string
  preferredTime: string
  notes?: string
}) {
  const state = readState()
  const req: AppointmentRequest = {
    id: uid('appt'),
    patientName: input.patientName.trim(),
    type: input.type,
    preferredDate: input.preferredDate,
    preferredTime: input.preferredTime,
    notes: (input.notes ?? '').trim(),
    status: 'Requested',
    createdAt: nowIso(),
  }
  writeState({ ...state, appointments: [req, ...state.appointments] })
  return req
}

export function scheduleAppointment(input: {
  appointmentId?: string
  patientName: string
  type: AppointmentType
  date: string
  time: string
  notes?: string
}) {
  const state = readState()
  if (input.appointmentId) {
    const next = state.appointments.map((a) =>
      a.id === input.appointmentId
        ? {
            ...a,
            status: 'Scheduled',
            scheduledDate: input.date,
            scheduledTime: input.time,
            notes: input.notes?.trim() ?? a.notes,
          }
        : a,
    )
    writeState({ ...state, appointments: next })
    return
  }

  const req: AppointmentRequest = {
    id: uid('appt'),
    patientName: input.patientName.trim(),
    type: input.type,
    preferredDate: '',
    preferredTime: '',
    notes: (input.notes ?? '').trim(),
    status: 'Scheduled',
    createdAt: nowIso(),
    scheduledDate: input.date,
    scheduledTime: input.time,
  }
  writeState({ ...state, appointments: [req, ...state.appointments] })
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const state = readState()
  const next = state.appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a))
  writeState({ ...state, appointments: next })
}

export function createOrderRequest(input: {
  patientName: string
  category: OrderCategory
  request: string
}) {
  const state = readState()
  const order: OrderRequest = {
    id: uid('order'),
    patientName: input.patientName.trim(),
    category: input.category,
    request: input.request.trim(),
    status: 'New',
    createdAt: nowIso(),
  }
  writeState({ ...state, orders: [order, ...state.orders] })
  return order
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const state = readState()
  const next = state.orders.map((o) => (o.id === orderId ? { ...o, status } : o))
  writeState({ ...state, orders: next })
}

export function clearPortalState() {
  writeState({ appointments: [], orders: [] })
}

