export type AppointmentType = 'New Patient Consultation' | 'Follow-Up Consultation'
export type AppointmentStatus = 'Requested' | 'Scheduled' | 'Completed'

export type OrderCategory = 'GLP-1' | 'Labs' | 'Supplements' | 'Other'
export type OrderStatus = 'New' | 'In Review' | 'Ordered' | 'Closed'
export type Glp1Medication = 'Semaglutide' | 'Tirzepatide' | 'Liraglutide' | 'Not sure'

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
  item?: string
  request: string
  status: OrderStatus
  createdAt: string
}

type PortalState = {
  appointments: AppointmentRequest[]
  orders: OrderRequest[]
  bookedSlots: string[]
  blackoutDates: string[]
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
    if (!raw) return { appointments: [], orders: [], bookedSlots: [], blackoutDates: [] }
    const parsed = JSON.parse(raw) as PortalState
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      bookedSlots: Array.isArray(parsed.bookedSlots) ? parsed.bookedSlots : [],
      blackoutDates: Array.isArray(parsed.blackoutDates) ? parsed.blackoutDates : [],
    }
  } catch {
    return { appointments: [], orders: [], bookedSlots: [], blackoutDates: [] }
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

function slotKey(date: string, time: string) {
  return `${date}T${time}`
}

export function isSlotBooked(date: string, time: string) {
  const state = readState()
  return state.bookedSlots.includes(slotKey(date, time))
}

export function isDateBlackout(date: string) {
  const state = readState()
  return state.blackoutDates.includes(date)
}

export function addBlackoutDate(date: string) {
  const state = readState()
  if (!date) return
  if (state.blackoutDates.includes(date)) return
  writeState({ ...state, blackoutDates: [date, ...state.blackoutDates].sort() })
}

export function removeBlackoutDate(date: string) {
  const state = readState()
  writeState({ ...state, blackoutDates: state.blackoutDates.filter((d) => d !== date) })
}

export function bookAppointment(input: {
  patientName: string
  type: AppointmentType
  date: string
  time: string
  notes?: string
}) {
  const state = readState()
  const key = slotKey(input.date, input.time)
  if (state.blackoutDates.includes(input.date)) {
    return { ok: false as const, reason: 'That date is closed.' }
  }
  if (state.bookedSlots.includes(key)) {
    return { ok: false as const, reason: 'Slot is already booked.' }
  }

  const appt: AppointmentRequest = {
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

  writeState({
    ...state,
    appointments: [appt, ...state.appointments],
    bookedSlots: [key, ...state.bookedSlots],
  })

  return { ok: true as const, appointment: appt }
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
  const key = slotKey(input.date, input.time)
  const nextBooked = state.bookedSlots.includes(key) ? state.bookedSlots : [key, ...state.bookedSlots]
  if (input.appointmentId) {
    const next = state.appointments.map((a) =>
      a.id === input.appointmentId
        ? {
            ...a,
            status: 'Scheduled' as const,
            scheduledDate: input.date,
            scheduledTime: input.time,
            notes: input.notes?.trim() ?? a.notes,
          }
        : a,
    )
    writeState({ ...state, appointments: next, bookedSlots: nextBooked })
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
  writeState({ ...state, appointments: [req, ...state.appointments], bookedSlots: nextBooked })
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const state = readState()
  const next = state.appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a))
  writeState({ ...state, appointments: next })
}

export function createOrderRequest(input: {
  patientName: string
  category: OrderCategory
  item?: string
  request: string
}) {
  const state = readState()
  const order: OrderRequest = {
    id: uid('order'),
    patientName: input.patientName.trim(),
    category: input.category,
    item: input.item?.trim() || undefined,
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
  writeState({ appointments: [], orders: [], bookedSlots: [], blackoutDates: [] })
}

