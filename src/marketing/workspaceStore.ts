/**
 * Team workspace preview (Quick schedule, local “scheduled” rows, blackouts).
 * — Persists for this browser until site data is cleared.
 * — Intentionally NOT removed when the team signs out (see `setMarketingProviderAuthed` in providerStore);
 *   sign-in only clears session + token so this data is still there after the next login.
 */
export const WORKSPACE_LOCAL_STORAGE_KEY = 'wph_marketing_workspace_v1' as const
const KEY = WORKSPACE_LOCAL_STORAGE_KEY

export type PersistedAppt = {
  id: string
  patientId: string
  /** Display name at schedule time; survives if inbox message is later deleted. */
  patientName?: string
  type: string
  when: string
  status: string
}

export type MarketingWorkspaceStateV1 = {
  v: 1
  appts: PersistedAppt[]
  blackouts: string[]
  qsPatient: string
  /** Free-typed name in Quick schedule; when set, it overrides the patient dropdown for the next add. */
  qsCustomName: string
  qsType: 'New Patient Consultation' | 'Follow-Up Consultation'
  qsWhen: string
  /**
   * Team Inbox message id → display label. Updated when inbox loads; keys are never removed so
   * names stay available in Quick schedule / tables after a message is deleted on the server.
   */
  inboxNameCache: Record<string, string>
}

const defaults: MarketingWorkspaceStateV1 = {
  v: 1,
  appts: [],
  blackouts: [],
  qsPatient: 'p1',
  qsCustomName: '',
  qsType: 'New Patient Consultation',
  qsWhen: '2026-05-02 10:00 AM',
  inboxNameCache: {},
}

/**
 * Team workspace: Quick schedule, scheduled preview table, and blackout list (per browser).
 * The inbox is stored on the API, not here.
 */
export function loadMarketingWorkspaceState(): MarketingWorkspaceStateV1 {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    const p = JSON.parse(raw) as Partial<MarketingWorkspaceStateV1>
    if (p.v !== 1) return { ...defaults }
    const apptsRaw = Array.isArray(p.appts) ? p.appts : []
    const appts: PersistedAppt[] = apptsRaw.map((a: Partial<PersistedAppt>) => {
      let status = String(a.status ?? '')
      if (status === 'Requested') status = 'Scheduled'
      return {
        id: String(a.id ?? ''),
        patientId: String(a.patientId ?? ''),
        patientName: typeof a.patientName === 'string' && a.patientName.trim() ? a.patientName.trim() : undefined,
        type: String(a.type ?? ''),
        when: String(a.when ?? ''),
        status,
      }
    })
    const cache =
      p.inboxNameCache && typeof p.inboxNameCache === 'object' && !Array.isArray(p.inboxNameCache)
        ? { ...(p.inboxNameCache as Record<string, string>) }
        : {}
    return {
      v: 1,
      appts,
      blackouts: Array.isArray(p.blackouts) ? p.blackouts : [],
      qsPatient: typeof p.qsPatient === 'string' && p.qsPatient ? p.qsPatient : defaults.qsPatient,
      qsCustomName: typeof p.qsCustomName === 'string' ? p.qsCustomName : defaults.qsCustomName,
      qsType: p.qsType === 'Follow-Up Consultation' ? 'Follow-Up Consultation' : 'New Patient Consultation',
      qsWhen: typeof p.qsWhen === 'string' ? p.qsWhen : defaults.qsWhen,
      inboxNameCache: cache,
    }
  } catch {
    return { ...defaults }
  }
}

export function saveMarketingWorkspaceState(next: MarketingWorkspaceStateV1) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...next, v: 1 as const }))
  } catch {
    // Private mode, quota, etc.
  }
}
