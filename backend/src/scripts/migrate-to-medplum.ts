import 'dotenv/config'
import { MedplumClient } from '@medplum/core'
import type { Appointment, Patient, Practitioner } from '@medplum/fhirtypes'
import { prisma } from '../db.js'

/**
 * One-time migration helper:
 * - Users(patient) -> Patient
 * - Users(provider) -> Practitioner
 * - Appointments -> Appointment
 *
 * Usage (example):
 *   MEDPLUM_BASE_URL=https://api.medplum.com
 *   MEDPLUM_CLIENT_ID=...
 *   MEDPLUM_CLIENT_SECRET=...
 *   DATABASE_URL=postgresql://...  DIRECT_URL=postgresql://...
 *   npx tsx src/scripts/migrate-to-medplum.ts
 */

const MEDPLUM_BASE_URL = (process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com').replace(/\/$/, '')
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID || ''
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET || ''

async function main() {
  if (!MEDPLUM_CLIENT_ID || !MEDPLUM_CLIENT_SECRET) {
    throw new Error('Missing MEDPLUM_CLIENT_ID or MEDPLUM_CLIENT_SECRET')
  }

  const medplum = new MedplumClient({ baseUrl: MEDPLUM_BASE_URL })
  await medplum.startClientLogin(MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET)

  const providers = await prisma.user.findMany({ where: { role: 'provider', deletedAt: null } })
  const patients = await prisma.user.findMany({ where: { role: 'patient', deletedAt: null } })
  const appointments = await prisma.appointment.findMany({ where: { deletedAt: null } })

  const providerMap = new Map<string, Practitioner>() // local userId -> Practitioner
  const patientMap = new Map<string, Patient>() // local userId -> Patient

  for (const p of providers) {
    const existing = await medplum.searchOne('Practitioner', `identifier=${encodeURIComponent(`wph-user:${p.id}`)}`)
    const created =
      existing ||
      (await medplum.createResource({
        resourceType: 'Practitioner',
        active: true,
        identifier: [{ system: 'wph', value: `wph-user:${p.id}` }],
        name: [{ text: p.displayName || p.username }],
      } as Practitioner))
    providerMap.set(p.id, created as any)
  }

  for (const u of patients) {
    const existing = await medplum.searchOne('Patient', `identifier=${encodeURIComponent(`wph-user:${u.id}`)}`)
    const created =
      existing ||
      (await medplum.createResource({
        resourceType: 'Patient',
        active: true,
        identifier: [{ system: 'wph', value: `wph-user:${u.id}` }],
        name: [
          {
            family: u.lastName || undefined,
            given: u.firstName ? [u.firstName] : undefined,
            text: u.displayName || u.username,
          },
        ],
        birthDate: u.birthdate ? new Date(u.birthdate).toISOString().slice(0, 10) : undefined,
        telecom: [
          ...(u.email ? [{ system: 'email', value: u.email }] : []),
          ...(u.phone ? [{ system: 'phone', value: u.phone }] : []),
        ],
        address: u.address1
          ? [
              {
                line: [u.address1, u.address2 || ''].filter(Boolean),
                city: u.city || undefined,
                state: u.state || undefined,
                postalCode: u.postalCode || undefined,
                country: u.country || undefined,
              },
            ]
          : undefined,
      } as Patient))
    patientMap.set(u.id, created as any)
  }

  for (const a of appointments) {
    const pat = patientMap.get(a.patientId)
    const prov = providerMap.get(a.providerId)
    if (!pat?.id || !prov?.id) continue

    const start = a.startTs ? a.startTs.toISOString() : a.preferredDate ? new Date(`${a.preferredDate}T${a.preferredTime || '09:00'}:00`).toISOString() : undefined
    const end = a.endTs ? a.endTs.toISOString() : start ? new Date(new Date(start).getTime() + 30 * 60_000).toISOString() : undefined

    await medplum.createResource({
      resourceType: 'Appointment',
      status: a.status === 'completed' ? 'fulfilled' : a.status === 'cancelled' ? 'cancelled' : a.status === 'scheduled' ? 'booked' : 'pending',
      description: a.notes || '',
      serviceType: [{ text: a.type === 'follow_up' ? 'Follow-Up Consultation' : 'New Patient Consultation' }],
      start,
      end,
      participant: [
        { actor: { reference: `Patient/${pat.id}` }, status: 'accepted' },
        { actor: { reference: `Practitioner/${prov.id}` }, status: 'accepted' },
      ],
    } as Appointment)
  }

  console.log('Migration complete.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

