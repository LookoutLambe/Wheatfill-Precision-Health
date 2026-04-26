export type AppointmentType = 'New Patient Consultation' | 'Follow-Up Consultation'
export type AppointmentStatus = 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled'

export type OrderCategory = 'GLP-1' | 'Labs' | 'Supplements' | 'Other'
export type OrderStatus = 'New' | 'In Review' | 'Ordered' | 'Closed'
export type Glp1Medication = 'Semaglutide' | 'Tirzepatide' | 'Not sure'

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
  scheduleConfig?: ScheduleConfigV1
}

const STORAGE_KEY = 'wph_portal_state_v1'
const EVENT_NAME = 'wph_portal_state_changed'

// Public → provider alert (team inbox).
import { apiPost } from '../api/client'

export type ScheduleConfigV1 = {
  slotMinutes: number
  /** 0=Sun..6=Sat. Times are local HH:MM (24h). */
  hoursByDow: Record<number, { start: string; end: string; enabled: boolean }>
}

export function getScheduleConfig(): ScheduleConfigV1 {
  const s = readState()
  const cfg = s.scheduleConfig
  const base: ScheduleConfigV1 = {
    slotMinutes: 30,
    hoursByDow: {
      0: { enabled: false, start: '09:00', end: '13:00' },
      1: { enabled: true, start: '08:30', end: '15:00' },
      2: { enabled: true, start: '08:30', end: '15:00' },
      3: { enabled: true, start: '08:30', end: '15:00' },
      4: { enabled: true, start: '08:30', end: '15:00' },
      5: { enabled: true, start: '08:30', end: '13:00' },
      6: { enabled: false, start: '09:00', end: '13:00' },
    },
  }
  if (!cfg || typeof cfg !== 'object') return base
  const slotMinutes = Number((cfg as any).slotMinutes)
  const hoursByDow = (cfg as any).hoursByDow as any
  const next: ScheduleConfigV1 = {
    slotMinutes: Number.isFinite(slotMinutes) && slotMinutes >= 10 && slotMinutes <= 120 ? slotMinutes : base.slotMinutes,
    hoursByDow: { ...base.hoursByDow },
  }
  if (hoursByDow && typeof hoursByDow === 'object') {
    for (const dow of Object.keys(base.hoursByDow)) {
      const n = Number(dow)
      const src = hoursByDow[n]
      if (!src || typeof src !== 'object') continue
      const enabled = Boolean((src as any).enabled)
      const start = String((src as any).start || '').trim()
      const end = String((src as any).end || '').trim()
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) continue
      next.hoursByDow[n] = { enabled, start, end }
    }
  }
  return next
}

export function setScheduleConfig(next: ScheduleConfigV1) {
  const state = readState()
  writeState({ ...state, scheduleConfig: next })
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return Math.max(0, Math.min(24 * 60, h * 60 + m))
}

/** Generate slots for a local YYYY-MM-DD date string, based on scheduleConfig. */
export function slotsForDate(dateYmd: string): Array<{ date: string; time: string }> {
  const [y, m, d] = dateYmd.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return []
  const dt = new Date(y, (m || 1) - 1, d || 1)
  const dow = dt.getDay()
  const cfg = getScheduleConfig()
  const hours = cfg.hoursByDow[dow]
  if (!hours?.enabled) return []
  const startMin = minutesSinceMidnight(hours.start)
  const endMin = minutesSinceMidnight(hours.end)
  const slot = Math.max(10, Math.min(120, cfg.slotMinutes | 0))
  const out: Array<{ date: string; time: string }> = []
  for (let t = startMin; t + slot <= endMin; t += slot) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0')
    const mm = String(t % 60).padStart(2, '0')
    out.push({ date: dateYmd, time: `${hh}:${mm}` })
  }
  return out
}

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
    if (!raw) return { appointments: [], orders: [], bookedSlots: [], blackoutDates: [], scheduleConfig: undefined }
    const parsed = JSON.parse(raw) as PortalState
    return {
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      bookedSlots: Array.isArray(parsed.bookedSlots) ? parsed.bookedSlots : [],
      blackoutDates: Array.isArray(parsed.blackoutDates) ? parsed.blackoutDates : [],
      scheduleConfig: (parsed as any).scheduleConfig,
    }
  } catch {
    return { appointments: [], orders: [], bookedSlots: [], blackoutDates: [], scheduleConfig: undefined }
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
  /** When true, sends an alert to the provider team inbox on the API. */
  notifyTeam?: boolean
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

  // Fire-and-forget team alert (used by multiple booking UIs; avoids missing inbox notifications).
  if (input.notifyTeam !== false) {
    const who = input.patientName.trim()
    const bodyLines = [
      `Type: ${input.type}`,
      `Preferred date: ${input.date}`,
      `Preferred time: ${input.time}`,
      input.notes?.trim() ? `Notes: ${input.notes.trim()}` : null,
    ].filter(Boolean) as string[]
    apiPost(
      '/v1/public/team-inbox',
      {
        kind: 'online_booking',
        fromName: who,
        fromEmail: '',
        body: bodyLines.join('\n'),
        meta: {
          apptType: input.type,
          date: input.date,
          time: input.time,
          notes: (input.notes || '').trim(),
          source: 'portalStore.bookAppointment',
        },
      },
      '',
    ).catch(() => {})
  }

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
    return input.appointmentId
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
  return req.id
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const state = readState()
  const next = state.appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a))
  writeState({ ...state, appointments: next })
}

/** Cancel/remove an appointment and free its booked slot (if any). */
export function removeAppointment(appointmentId: string) {
  const state = readState()
  const appt = state.appointments.find((a) => a.id === appointmentId)
  const nextAppts = state.appointments.filter((a) => a.id !== appointmentId)
  if (!appt?.scheduledDate || !appt?.scheduledTime) {
    writeState({ ...state, appointments: nextAppts })
    return
  }
  const key = slotKey(appt.scheduledDate, appt.scheduledTime.slice(0, 5))
  writeState({
    ...state,
    appointments: nextAppts,
    bookedSlots: state.bookedSlots.filter((k) => k !== key),
  })
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

