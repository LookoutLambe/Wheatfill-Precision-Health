import type { Appointment, Practitioner, Patient, Reference, Schedule, Slot } from '@medplum/fhirtypes'
import type { MedplumClient } from '@medplum/core'

export type UiApptType = 'New Patient Consultation' | 'Follow-Up Consultation'

export function toServiceTypeText(t: UiApptType) {
  return t
}

export function apptStatusToUi(status?: Appointment['status']): 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled' {
  if (status === 'fulfilled') return 'Completed'
  if (status === 'cancelled' || status === 'noshow') return 'Cancelled'
  if (status === 'booked' || status === 'arrived') return 'Scheduled'
  return 'Requested'
}

export function uiToApptStatus(next: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled'): Appointment['status'] {
  if (next === 'Completed') return 'fulfilled'
  if (next === 'Cancelled') return 'cancelled'
  if (next === 'Scheduled') return 'booked'
  return 'pending'
}

export function ref(resourceType: Reference['reference'] extends `${infer RT}/${string}` ? RT : any, id: string): Reference {
  return { reference: `${resourceType}/${id}` }
}

export async function ensureSchedule(medplum: MedplumClient, practitioner: Practitioner): Promise<Schedule> {
  const pid = practitioner.id
  if (!pid) throw new Error('Practitioner profile missing id')
  const existing = await medplum.searchOne('Schedule', `actor=Practitioner/${pid}`)
  if (existing) return existing as any
  return (await medplum.createResource({
    resourceType: 'Schedule',
    active: true,
    actor: [{ reference: `Practitioner/${pid}` }],
    comment: 'WPH provider schedule',
  } as Schedule)) as any
}

export async function listBlackoutSlots(medplum: MedplumClient, scheduleId: string, startIso: string, endIso: string) {
  // Slots use start/end dateTime
  return (await medplum.searchResources(
    'Slot',
    `schedule=Schedule/${scheduleId}&status=busy-unavailable&start=ge${encodeURIComponent(startIso)}&start=lt${encodeURIComponent(endIso)}`,
  )) as any as Slot[]
}

export async function createBlackoutDay(
  medplum: MedplumClient,
  scheduleId: string,
  date: string, // YYYY-MM-DD
  reason?: string,
) {
  const start = new Date(`${date}T00:00:00`).toISOString()
  const end = new Date(`${date}T23:59:59`).toISOString()
  return (await medplum.createResource({
    resourceType: 'Slot',
    schedule: { reference: `Schedule/${scheduleId}` },
    status: 'busy-unavailable',
    start,
    end,
    comment: reason?.trim() || 'Blackout',
  } as Slot)) as any as Slot
}

export async function listAppointmentsForRange(
  medplum: MedplumClient,
  participantRef: string,
  startIso: string,
  endIso: string,
) {
  // FHIR Appointment search supports date (start/end) using `date`
  // We search by participant and date range.
  return (await medplum.searchResources(
    'Appointment',
    `participant=${encodeURIComponent(participantRef)}&date=ge${encodeURIComponent(startIso)}&date=lt${encodeURIComponent(endIso)}`,
  )) as any as Appointment[]
}

export async function createBookedAppointment(input: {
  medplum: MedplumClient
  patient: Patient
  practitioner: Practitioner
  startIso: string
  endIso: string
  type: UiApptType
  notes?: string
}): Promise<Appointment> {
  const pid = input.patient.id
  const prid = input.practitioner.id
  if (!pid || !prid) throw new Error('Missing profile ids')
  return (await input.medplum.createResource({
    resourceType: 'Appointment',
    status: 'booked',
    description: input.notes?.trim() || '',
    serviceType: [{ text: toServiceTypeText(input.type) }],
    start: input.startIso,
    end: input.endIso,
    participant: [
      { actor: { reference: `Patient/${pid}` }, status: 'accepted' },
      { actor: { reference: `Practitioner/${prid}` }, status: 'accepted' },
    ],
  } as Appointment)) as any
}

