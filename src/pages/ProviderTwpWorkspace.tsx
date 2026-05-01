import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  apiDelete,
  apiGetWithSessionWarmup,
  apiPatch,
  fetchApiSession,
  getApiUrl,
  getToken,
  hasApiSessionHint,
  hasApiCredential,
  setApiSessionHint,
} from '../api/client'
import {
  addBlackoutDate,
  addBlackoutBlock,
  getPortalState,
  removeAppointment,
  removeBlackoutDate,
  removeBlackoutBlock,
  scheduleAppointment,
  subscribePortalState,
  updateAppointmentStatus,
} from '../data/portalStore'
import {
  getMarketingIntegrations,
  getMarketingProviderLoginDisplay,
  isMarketingProviderAuthed,
  MARKETING_PROVIDER_AUTH_EVENT,
  setMarketingProviderAuthed,
} from '../marketing/providerStore'
import { loadMarketingWorkspaceState, saveMarketingWorkspaceState } from '../marketing/workspaceStore'
import { type TeamInboxChangedDetail, WPH_TEAM_INBOX_CHANGED } from '../provider/teamInboxPoller'

type DemoPatient = { id: string; label: string }
type DemoAppt = {
  id: string
  /** Appointment id in portalStore (drives /provider/schedule). */
  portalApptId?: string
  patientId: string
  patientName?: string
  type: string
  when: string
  /** Local preview rows use Scheduled/Completed/Cancelled. Inbox-synthesized rows use Requested until staff Quick-schedules or marks handled in inbox. */
  status: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled'
  /** Team inbox message id when this row is synthesized from an online_booking request. */
  sourceInboxId?: string
}
type DemoMsg = {
  id: string
  from: string
  fromName: string
  category: string
  body: string
  when: string
  status: 'new' | 'handled'
}
type ProviderOrderRow = {
  id: string
  category: string
  item: string | null
  request: string
  status: string
  createdAt: string
  shippingAddress1: string
  shippingAddress2: string
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  shippingCents: number
  shippingInsuranceCents: number
  agreedToShippingTerms: boolean
  contactPermission: boolean
  signatureName: string
  signatureDate: string | null
  items: Array<{
    id: string
    name: string
    productSku: string
    quantity: number
    unitPriceCents: number
  }>
  patient: {
    id: string
    displayName: string
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
  }
  pharmacyPartner: { id: string; name: string; slug: string } | null
}

function auditEntityLabel(entityType: string) {
  const map: Record<string, string> = {
    order: 'Orders',
    appointment: 'Appointments',
    team_inbox_item: 'Team inbox',
    blackout: 'Blackouts / availability',
    provider_profile: 'Provider profile',
    user: 'Users',
  }
  return map[entityType] || entityType.replace(/_/g, ' ')
}

function norm(s: unknown) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAll(haystack: string, tokens: string[]) {
  const h = norm(haystack)
  return tokens.every((t) => h.includes(t))
}

function seedWorkspacePatients(): DemoPatient[] {
  return [
    { id: 'p1', label: 'Demo patient A' },
    { id: 'p2', label: 'Demo patient B' },
    { id: 'p3', label: 'Demo patient C' },
  ]
}

function normalizePersistedApptStatus(s: string): DemoAppt['status'] {
  if (s === 'Requested' || s === 'Scheduled' || s === 'Completed' || s === 'Cancelled') return s
  return 'Scheduled'
}

function parseInboxBodyForQuickSchedule(body: string) {
  const typeLine = /Type:\s*(.+)/i.exec(body)?.[1]?.trim() || ''
  const datePart = /Preferred date:\s*(\S+)/i.exec(body)?.[1]?.trim()
  const timePart = /Preferred time:\s*(\S+)/i.exec(body)?.[1]?.trim()
  let visitType: 'New Patient Consultation' | 'Follow-Up Consultation' = 'New Patient Consultation'
  if (/follow[-\s]?up|return/i.test(typeLine)) visitType = 'Follow-Up Consultation'
  if (/new\s*patient|first|intro/i.test(typeLine)) visitType = 'New Patient Consultation'
  const whenText =
    datePart && timePart
      ? `${datePart} ${timePart}`.replace(/\s+/g, ' ').trim()
      : null
  return { visitType, whenText }
}

export default function ProviderTwpWorkspace() {
  const location = useLocation()
  const navigate = useNavigate()

  // Legacy bookmarks used ?panel=inbox|schedule|orders for a single-panel layout; always show the full workspace.
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    if (!sp.has('panel')) return
    sp.delete('panel')
    const q = sp.toString()
    navigate(`${location.pathname}${q ? `?${q}` : ''}${location.hash}`, { replace: true })
  }, [location.search, location.pathname, location.hash, navigate])

  const readPersisted = useCallback(<T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }, [])

  const who = getMarketingProviderLoginDisplay()
  const signOut = useCallback(() => {
    setMarketingProviderAuthed(false)
    navigate('/', { replace: true })
  }, [navigate])

  const demoPatients = useMemo(() => seedWorkspacePatients(), [])
  const initialWs = useMemo(() => loadMarketingWorkspaceState(), [])
  const [appts, setAppts] = useState<DemoAppt[]>(() =>
    initialWs.appts.map((a) => ({
      ...a,
      status: normalizePersistedApptStatus(a.status),
    })),
  )
  const [orders, setOrders] = useState<ProviderOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [auditSummary, setAuditSummary] = useState<{
    total: number
    byEntityType: Array<{ entityType: string; count: number }>
  } | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<DemoMsg[]>([])
  const [inboxNameCache, setInboxNameCache] = useState<Record<string, string>>(() => initialWs.inboxNameCache)
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [inboxLoading, setInboxLoading] = useState(false)
  // Payment rails removed.
  const [blackouts, setBlackouts] = useState<string[]>(() => getPortalState().blackoutDates || [])
  const [blackoutBlocks, setBlackoutBlocks] = useState<Array<{ date: string; start: string; end: string }>>(
    () => (getPortalState() as any).blackoutBlocks || [],
  )
  const [timeOffDate, setTimeOffDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [timeOffAllDay, setTimeOffAllDay] = useState(true)
  const [timeOffStart, setTimeOffStart] = useState('12:00')
  const [timeOffEnd, setTimeOffEnd] = useState('13:00')

  const [inboxQuery, setInboxQuery] = useState(() => readPersisted('wph_provider_inbox_query', ''))
  const [inboxFilter, setInboxFilter] = useState<'all' | 'new' | 'handled'>(() => readPersisted('wph_provider_inbox_filter', 'new'))
  const [apptQuery, setApptQuery] = useState(() => readPersisted('wph_provider_appt_query', ''))
  const [apptFilter, setApptFilter] = useState<'all' | 'Scheduled' | 'Completed' | 'Cancelled'>(() =>
    readPersisted('wph_provider_appt_filter', 'Scheduled'),
  )

  // Deep links from header stat pills (?apptFilter= / ?inboxFilter=)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const af = sp.get('apptFilter')
    if (af === 'Scheduled' || af === 'Completed' || af === 'Cancelled' || af === 'all') setApptFilter(af as typeof apptFilter)
    const iff = sp.get('inboxFilter')
    if (iff === 'new' || iff === 'handled' || iff === 'all') setInboxFilter(iff as typeof inboxFilter)
  }, [location.search])

  useEffect(() => {
    const raw = (location.hash || '').replace(/^#/, '').trim()
    if (!raw) return
    const id = decodeURIComponent(raw)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })
  }, [location.hash, location.pathname])

  useEffect(() => {
    try {
      localStorage.setItem('wph_provider_inbox_query', JSON.stringify(inboxQuery))
      localStorage.setItem('wph_provider_inbox_filter', JSON.stringify(inboxFilter))
      localStorage.setItem('wph_provider_appt_query', JSON.stringify(apptQuery))
      localStorage.setItem('wph_provider_appt_filter', JSON.stringify(apptFilter))
    } catch {
      // ignore
    }
  }, [apptFilter, apptQuery, inboxFilter, inboxQuery])

  const [qsPatient, setQsPatient] = useState(initialWs.qsPatient)
  const [qsCustomName, setQsCustomName] = useState(initialWs.qsCustomName)
  const [qsType, setQsType] = useState<'New Patient Consultation' | 'Follow-Up Consultation'>(initialWs.qsType)
  const [qsWhen, setQsWhen] = useState(initialWs.qsWhen)
  const [qsDate, setQsDate] = useState(() => (initialWs.qsWhen || '').slice(0, 10) || new Date().toISOString().slice(0, 10))
  const [qsTime, setQsTime] = useState('09:00')

  const inboxSearchRef = useRef<HTMLInputElement | null>(null)
  const scheduleSearchRef = useRef<HTMLInputElement | null>(null)

  const workspacePersistRef = useRef({ appts, blackouts, qsPatient, qsCustomName, qsType, qsWhen, inboxNameCache })
  workspacePersistRef.current = { appts, blackouts, qsPatient, qsCustomName, qsType, qsWhen, inboxNameCache }

  useEffect(() => {
    saveMarketingWorkspaceState({
      v: 1,
      appts,
      // Keep writing blackouts for backwards compatibility with older builds, but source of truth is portalStore.
      blackouts,
      qsPatient,
      qsCustomName,
      qsType,
      qsWhen,
      inboxNameCache,
    })
  }, [appts, blackouts, qsPatient, qsCustomName, qsType, qsWhen, inboxNameCache])

  useEffect(() => {
    return () => {
      const s = workspacePersistRef.current
      saveMarketingWorkspaceState({
        v: 1,
        appts: s.appts,
        blackouts: s.blackouts,
        qsPatient: s.qsPatient,
        qsCustomName: s.qsCustomName,
        qsType: s.qsType,
        qsWhen: s.qsWhen,
        inboxNameCache: s.inboxNameCache,
      })
    }
  }, [])

  // One-time migration: move any older "preview blackouts" into the shared portal store so patients + schedule see them.
  useEffect(() => {
    const existing = new Set((getPortalState().blackoutDates || []).map((d) => String(d)))
    for (const d of initialWs.blackouts || []) {
      const iso = String(d || '').trim()
      if (!iso) continue
      if (existing.has(iso)) continue
      addBlackoutDate(iso)
    }
  }, [initialWs.blackouts])

  // Keep this page in sync with the shared blackout list.
  useEffect(() => {
    const sync = () => {
      const s = getPortalState() as any
      setBlackouts(s.blackoutDates || [])
      setBlackoutBlocks(s.blackoutBlocks || [])
    }
    sync()
    return subscribePortalState(sync)
  }, [])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    ;(async () => {
      const s = await fetchApiSession()
      if (s.ok && s.authenticated) {
        setApiSessionHint()
        return
      }
      // Static site → API on another host: cookies often are not sent; JWT bearer from POST /auth/login is required.
      if (s.ok && !s.authenticated && !(getToken() || '').trim()) {
        const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)
        navigate(`/provider/login?next=${next}`, { replace: true })
      }
    })()
  }, [navigate, location.pathname, location.search, location.hash])

  /** From `/provider/inbox`: Preselect jumps back here and fills Quick schedule from `location.state.inboxQuickPick`. */
  useEffect(() => {
    const pick = (
      location.state as {
        inboxQuickPick?: { id: string; fromName: string; category: string; body: string; when: string }
      } | null
    )?.inboxQuickPick
    if (!pick?.id) return
    if (pick.fromName?.trim()) {
      const shortDate = pick.when.split(',')[0]?.trim() || ''
      const label = shortDate ? `${pick.fromName.trim()} (${shortDate})` : pick.fromName.trim()
      setInboxNameCache((prev) => ({ ...prev, [pick.id]: label }))
    }
    setQsPatient(`inbox:${pick.id}`)
    if (pick.category === 'online_booking') {
      const { visitType, whenText } = parseInboxBodyForQuickSchedule(pick.body)
      setQsType(visitType)
      if (whenText) setQsWhen(whenText)
    }
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: {} })
    requestAnimationFrame(() => {
      document.getElementById('twp-quick-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.state, location.pathname, location.search, location.hash, navigate])

  const loadTeamInbox = useCallback(async () => {
    setInboxLoading(true)
    setInboxError(null)
    try {
      const r = await apiGetWithSessionWarmup<{
        items: Array<{
          id: string
          kind: string
          status: string
          fromName: string
          fromEmail: string
          body: string
          createdAt: string
        }>
      }>('/v1/provider/team-inbox')
      const next = r.items.map((row) => ({
        id: row.id,
        from: [row.fromName, row.fromEmail && row.fromEmail.trim() ? `<${row.fromEmail}>` : ''].filter(Boolean).join(' '),
        fromName: (row.fromName || '').trim(),
        category: row.kind,
        body: row.body,
        when: new Date(row.createdAt).toLocaleString(),
        status: (row.status === 'handled' ? 'handled' : 'new') as DemoMsg['status'],
      }))
      setMsgs(next)
      setInboxNameCache((prev) => {
        const n = { ...prev }
        for (const m of next) {
          if (!m.fromName.trim().length) continue
          const shortDate = m.when.split(',')[0]?.trim() || ''
          n[m.id] = shortDate ? `${m.fromName} (${shortDate})` : m.fromName
        }
        return n
      })
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        const tok = (getToken() || '').trim()
        const authBits = [
          `api=${getApiUrl()}`,
          `token=${tok ? `${tok.slice(0, 12)}…` : 'none'}`,
          `sessionHint=${hasApiSessionHint() ? '1' : '0'}`,
        ].join(' · ')
        setInboxError(
          `Could not load inbox (401). Sign in again at Provider login — the API needs a bearer token when cookies cannot reach ${getApiUrl()}. ${authBits}`,
        )
      } else {
        setInboxError(msg)
      }
      setMsgs([])
    } finally {
      setInboxLoading(false)
    }
  }, [navigate])

  // Load after sign-in, when returning to the tab, or when the API session changes in another tab.
  useEffect(() => {
    if (!isMarketingProviderAuthed()) return
    void loadTeamInbox()
  }, [loadTeamInbox])

  // Payment rails removed.

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const r = await apiGetWithSessionWarmup<{ orders: ProviderOrderRow[] }>('/v1/provider/orders')
      setOrders(
        (r.orders || []).map((o) => ({
          ...o,
          createdAt: typeof o.createdAt === 'string' ? o.createdAt : (o as any).createdAt,
        })),
      )
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        const tok = (getToken() || '').trim()
        const authBits = [
          `api=${getApiUrl()}`,
          `token=${tok ? `${tok.slice(0, 12)}…` : 'none'}`,
          `sessionHint=${hasApiSessionHint() ? '1' : '0'}`,
        ].join(' · ')
        setOrdersError(
          `Could not load orders (401). Sign in again at Provider login — cross-site API calls need the bearer token when cookies are not sent. ${authBits}`,
        )
      } else {
        setOrdersError(msg)
        setOrders([])
      }
    } finally {
      setOrdersLoading(false)
    }
  }, [navigate])

  const loadAudit = useCallback(async () => {
    setAuditLoading(true)
    setAuditError(null)
    try {
      const r = await apiGetWithSessionWarmup<{ total: number; byEntityType: Array<{ entityType: string; count: number }> }>(
        '/v1/provider/audit/summary',
      )
      setAuditSummary({
        total: typeof r.total === 'number' ? r.total : 0,
        byEntityType: Array.isArray(r.byEntityType) ? r.byEntityType : [],
      })
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        const tok = (getToken() || '').trim()
        const authBits = [
          `api=${getApiUrl()}`,
          `token=${tok ? `${tok.slice(0, 12)}…` : 'none'}`,
          `sessionHint=${hasApiSessionHint() ? '1' : '0'}`,
        ].join(' · ')
        setAuditError(
          `Could not load audit log (401). Sign in again at Provider login — cross-site API calls need the bearer token when cookies are not sent. ${authBits}`,
        )
      } else {
        setAuditError(msg)
      }
      setAuditSummary(null)
    } finally {
      setAuditLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (isMarketingProviderAuthed()) void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (isMarketingProviderAuthed()) void loadAudit()
  }, [loadAudit])

  // Token/session changes (other tab, return from login, PWA resume): refresh inbox and orders together.
  useEffect(() => {
    const sync = () => {
      void loadTeamInbox()
      void loadOrders()
      void loadAudit()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'wph_token_v1') sync()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener(MARKETING_PROVIDER_AUTH_EVENT, sync)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener(MARKETING_PROVIDER_AUTH_EVENT, sync)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [loadTeamInbox, loadOrders, loadAudit])

  useEffect(() => {
    const onPoll = (e: Event) => {
      const ce = e as CustomEvent<TeamInboxChangedDetail>
      if (!ce.detail?.newSinceLast?.length) return
      void loadTeamInbox()
    }
    window.addEventListener(WPH_TEAM_INBOX_CHANGED, onPoll)
    return () => window.removeEventListener(WPH_TEAM_INBOX_CHANGED, onPoll)
  }, [loadTeamInbox])

  const newCount = msgs.filter((m) => m.status === 'new').length
  const handledCount = msgs.filter((m) => m.status === 'handled').length
  const bookingNewCount = msgs.filter((m) => m.category === 'online_booking' && m.status === 'new').length
  const bookingHandledCount = msgs.filter((m) => m.category === 'online_booking' && m.status === 'handled').length

  /** New Book Online inbox rows shown in the schedule panel until staff adds them via Quick schedule (same inbox id) or marks handled. */
  const inboxBookingQueue = useMemo((): DemoAppt[] => {
    const claimed = new Set(
      appts
        .filter((a) => a.status !== 'Cancelled')
        .map((a) => (a.patientId.startsWith('inbox:') ? a.patientId.slice('inbox:'.length) : ''))
        .filter(Boolean),
    )
    return msgs
      .filter((m) => m.category === 'online_booking' && m.status === 'new' && !claimed.has(m.id))
      .map((m) => {
        const { visitType, whenText } = parseInboxBodyForQuickSchedule(m.body)
        return {
          id: `inbox_req:${m.id}`,
          patientId: `inbox:${m.id}`,
          patientName: m.fromName.trim(),
          type: visitType,
          when: whenText || '—',
          status: 'Requested' as const,
          sourceInboxId: m.id,
        }
      })
  }, [appts, msgs])

  const scheduleApptsMerged = useMemo(() => [...inboxBookingQueue, ...appts], [inboxBookingQueue, appts])

  const requestedCount = inboxBookingQueue.length
  const scheduledCount = appts.filter((a) => a.status === 'Scheduled').length
  const completedCount = appts.filter((a) => a.status === 'Completed').length
  const cancelledCount = appts.filter((a) => a.status === 'Cancelled').length
  const ordersNewCount = orders.filter((o) => o.status === 'new').length
  const ordersInReviewCount = orders.filter((o) => o.status === 'in_review').length
  const ordersOrderedCount = orders.filter((o) => o.status === 'ordered').length
  const ordersClosedCount = orders.filter((o) => o.status === 'closed').length
  const ordersDeclinedCount = orders.filter((o) => o.status === 'declined').length
  const ordersTotalCount = orders.length

  /**
   * Inbox rows for Quick schedule patient picker.
   *
   * Important: do NOT re-add deleted inbox rows from local cache. If one user deletes
   * an inbox message, it should disappear for everyone.
   */
  const inboxRequestPatients = useMemo((): DemoPatient[] => {
    const fromMsgs: DemoPatient[] = msgs
      .filter((m) => m.fromName.trim().length > 0)
      .map((m) => {
        const shortDate = m.when.split(',')[0]?.trim() || ''
        return {
          id: `inbox:${m.id}`,
          label: shortDate ? `${m.fromName} (${shortDate})` : m.fromName,
        }
      })
    return fromMsgs
  }, [msgs, inboxNameCache])

  const allPatientOptions = useMemo((): DemoPatient[] => {
    return [...inboxRequestPatients, ...demoPatients]
  }, [inboxRequestPatients, demoPatients])

  const labelForPatientId = (patientId: string) => {
    if (['p1', 'p2', 'p3'].includes(patientId)) {
      return demoPatients.find((p) => p.id === patientId)?.label || '—'
    }
    if (patientId.startsWith('inbox:')) {
      const raw = patientId.slice(7)
      if (inboxNameCache[raw]) return inboxNameCache[raw]
      const m = msgs.find((x) => x.id === raw)
      if (m?.fromName) {
        const shortDate = m.when.split(',')[0]?.trim() || ''
        return shortDate ? `${m.fromName} (${shortDate})` : m.fromName
      }
      return '—'
    }
    if (patientId.startsWith('custom:')) {
      return '—'
    }
    return '—'
  }

  const rowPatientLabel = (a: DemoAppt) => (a.patientName?.trim() ? a.patientName.trim() : labelForPatientId(a.patientId))

  useEffect(() => {
    if (allPatientOptions.some((p) => p.id === qsPatient)) return
    setQsPatient(allPatientOptions[0]?.id || 'p1')
  }, [allPatientOptions, qsPatient])

  const staffCalendarUrl = getMarketingIntegrations().bookingUrl.trim()

  const inboxTokens = useMemo(() => norm(inboxQuery).split(' ').filter(Boolean), [inboxQuery])
  const filteredMsgs = useMemo(() => {
    const base =
      inboxFilter === 'all' ? msgs : msgs.filter((m) => (inboxFilter === 'new' ? m.status === 'new' : m.status === 'handled'))
    if (inboxTokens.length === 0) return base
    return base.filter((m) =>
      includesAll([m.from, m.category, m.when, m.body].filter(Boolean).join(' | '), inboxTokens),
    )
  }, [inboxFilter, inboxTokens, msgs])

  const apptTokens = useMemo(() => norm(apptQuery).split(' ').filter(Boolean), [apptQuery])
  const filteredAppts = useMemo(() => {
    const base =
      apptFilter === 'all'
        ? scheduleApptsMerged
        : apptFilter === 'Scheduled'
          ? scheduleApptsMerged.filter((a) => a.status === 'Scheduled' || a.status === 'Requested')
          : scheduleApptsMerged.filter((a) => a.status === apptFilter)
    if (apptTokens.length === 0) return base
    return base.filter((a) =>
      includesAll([rowPatientLabel(a), a.type, a.when, a.status].filter(Boolean).join(' | '), apptTokens),
    )
  }, [apptFilter, apptTokens, scheduleApptsMerged])

  return (
    <div className="page teamWorkspacePage">
      <header className="teamWorkspaceHeader" aria-label="Team Workspace">
        <div className="teamWorkspaceHeaderRow">
          <h1>Team Workspace</h1>
          <div className="teamWorkspaceHeaderMeta">
            {who ? (
              <div className="pill" style={{ width: 'fit-content' }}>
                Signed in as: {who}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btnAccent teamWorkspaceHeaderSignOut"
              onClick={signOut}
              title="Sign out of the team workspace"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="teamWorkspaceToolbar" style={{ paddingTop: 0 }}>
          <div className="pill teamWorkspaceStatPill" title="Open full inbox">
            <Link to="/provider/inbox" className="teamWorkspaceStatPillLink">
              Inbox:
            </Link>
            <Link to="/provider/inbox?inboxFilter=new" className="teamWorkspaceStatPillLink">
              {' '}
              <b>{newCount}</b> new
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/inbox?inboxFilter=handled" className="teamWorkspaceStatPillLink">
              {handledCount} handled
            </Link>
          </div>
          <div className="pill teamWorkspaceStatPill" title="Book Online requests in inbox">
            <Link to="/provider/inbox?category=online_booking" className="teamWorkspaceStatPillLink">
              Booking requests:
            </Link>
            <Link to="/provider/inbox?category=online_booking&inboxFilter=new" className="teamWorkspaceStatPillLink">
              {' '}
              <b>{bookingNewCount}</b> new
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/inbox?category=online_booking&inboxFilter=handled" className="teamWorkspaceStatPillLink">
              {bookingHandledCount} handled
            </Link>
          </div>
          <div className="pill teamWorkspaceStatPill" title="Scheduled & completed on this workspace">
            <span style={{ fontWeight: 700 }}>Visits: </span>
            <Link to="/provider?apptFilter=Scheduled#twp-schedule" className="teamWorkspaceStatPillLink">
              <b>{scheduledCount}</b> scheduled
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider?apptFilter=Completed#twp-schedule" className="teamWorkspaceStatPillLink">
              {completedCount} completed
            </Link>
          </div>
          <div className="pill teamWorkspaceStatPill" title="Patient orders (API)">
            <Link to="/provider/orders" className="teamWorkspaceStatPillLink">
              Orders:
            </Link>
            <Link to="/provider/orders" className="teamWorkspaceStatPillLink">
              {' '}
              <b>{ordersTotalCount}</b> total
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/orders?orderFilter=new" className="teamWorkspaceStatPillLink">
              <b>{ordersNewCount}</b> new
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/orders?orderFilter=in_review" className="teamWorkspaceStatPillLink">
              {ordersInReviewCount} in review
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/orders?orderFilter=ordered" className="teamWorkspaceStatPillLink">
              {ordersOrderedCount} ordered
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/orders?orderFilter=closed" className="teamWorkspaceStatPillLink">
              {ordersClosedCount} closed
            </Link>
            <span className="teamWorkspaceStatPillSep"> · </span>
            <Link to="/provider/orders?orderFilter=declined" className="teamWorkspaceStatPillLink">
              {ordersDeclinedCount} declined
            </Link>
          </div>
        </div>
        <div className="teamWorkspaceToolbar" role="toolbar" aria-label="Workspace shortcuts">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Public site
          </Link>
          {staffCalendarUrl ? (
            <a
              href={staffCalendarUrl}
              className="btn btnPrimary"
              style={{ textDecoration: 'none' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open staff calendar
            </a>
          ) : (
            <Link to="/provider/integrations" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              Set staff calendar URL
            </Link>
          )}
          <Link to="/provider/security" className="btn" style={{ textDecoration: 'none' }}>
            Change password
          </Link>
        </div>
      </header>

      <div className="cardGrid">
        <section className="card cardAccentNavy cardSpan12">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Requests</h2>
            {ordersNewCount > 0 ? <span className="pill pillRed">{ordersNewCount} New</span> : <span className="pill">Queue</span>}
          </div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Quick links for day-to-day requests from patients: booking/time requests, order requests, and the full weekly schedule.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <Link to="/provider/orders" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              View order requests
            </Link>
            <Link to="/provider/inbox" className="btn" style={{ textDecoration: 'none' }}>
              View inbox
            </Link>
            <Link to="/provider/schedule" className="btn" style={{ textDecoration: 'none' }}>
              Weekly schedule
            </Link>
            <Link to="/ordering" className="btn" style={{ textDecoration: 'none' }}>
              Patient order page
            </Link>
          </div>
        </section>

        <section className="card cardAccentSoft" id="twp-inbox">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <Link
              to="/provider/inbox"
              className={`pill ${newCount > 0 ? 'pillRed' : ''}`}
              style={{ textDecoration: 'none' }}
              title="Open full inbox"
            >
              {newCount > 0 ? `${newCount} new` : 'Up to date'}
            </Link>
          </div>
          <div className="divider" />
          <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Search
              </div>
              <input
                className="input"
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                placeholder="Name, email, keyword…"
                ref={inboxSearchRef}
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Filter
              </div>
              <select className="select" value={inboxFilter} onChange={(e) => setInboxFilter(e.target.value as any)}>
                <option value="new">New</option>
                <option value="handled">Handled</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
          <div className="btnRow" style={{ marginBottom: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn"
              onClick={() => void loadTeamInbox()}
              disabled={inboxLoading || !hasApiCredential()}
            >
              {inboxLoading ? 'Loading…' : 'Refresh'}
            </button>
            <span className="pill" title="Rows shown after filters/search">
              Showing: <b>{filteredMsgs.length}</b>
            </span>
          </div>

          {inboxError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, marginTop: 0 }}>
              {inboxError}
            </p>
          ) : null}
          {hasApiCredential() && filteredMsgs.length === 0 && msgs.length === 0 && !inboxError ? (
            <p className="muted">No messages yet. New contact and time-request form alerts will list here.</p>
          ) : null}
          {hasApiCredential() && filteredMsgs.length === 0 && msgs.length > 0 ? (
            <p className="muted">No messages match your search/filter.</p>
          ) : null}
          {hasApiCredential() && filteredMsgs.length > 0 ? (
            <div className="teamWidgetScroll">
              <div className="tableWrap">
              <table className="table" aria-label="Inbox">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>From</th>
                    <th>Category</th>
                    <th>Message</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMsgs.map((m) => (
                    <tr key={m.id}>
                      <td className="muted">{m.when}</td>
                      <td className="muted">{m.from}</td>
                      <td className="muted">{m.category}</td>
                      <td>{m.body}</td>
                      <td>
                        <div className="btnRow" style={{ flexWrap: 'wrap', gap: 8 }}>
                          {m.fromName.trim() ? (
                            <button
                              type="button"
                              className="btn"
                              title="Select this person in Quick schedule; fills date/time from the request when available"
                              onClick={() => {
                                if (m.fromName.trim()) {
                                  const shortDate = m.when.split(',')[0]?.trim() || ''
                                  const label = shortDate ? `${m.fromName} (${shortDate})` : m.fromName
                                  setInboxNameCache((prev) => ({ ...prev, [m.id]: label }))
                                }
                                setQsPatient(`inbox:${m.id}`)
                                if (m.category === 'online_booking') {
                                  const { visitType, whenText } = parseInboxBodyForQuickSchedule(m.body)
                                  setQsType(visitType)
                                  if (whenText) setQsWhen(whenText)
                                }
                                document.getElementById('twp-quick-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                            >
                              Preselect
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn"
                            disabled={m.status === 'handled' || !hasApiCredential()}
                            style={{ opacity: m.status === 'handled' ? 0.6 : 1 }}
                            onClick={() => {
                              ;(async () => {
                                try {
                                  await apiPatch(`/v1/provider/team-inbox/${encodeURIComponent(m.id)}`, { status: 'handled' })
                                  await loadTeamInbox()
                                } catch {
                                  /* keep UI; user can refresh */
                                }
                              })()
                            }}
                          >
                            {m.status === 'handled' ? 'Handled' : 'Mark handled'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ color: '#7a0f1c', borderColor: 'rgba(122, 15, 28, 0.35)' }}
                            disabled={!hasApiCredential()}
                            onClick={() => {
                              if (!hasApiCredential()) return
                              if (!window.confirm('Delete this request from the inbox? This cannot be undone.')) return
                              ;(async () => {
                                try {
                                  setInboxError(null)
                                  await apiDelete<{ ok: boolean }>(`/v1/provider/team-inbox/${encodeURIComponent(m.id)}`)
                                  await loadTeamInbox()
                                } catch (e) {
                                  setInboxError(String((e as Error)?.message || e) || 'Delete failed. Check the API and try again.')
                                }
                              })()
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : null}
        </section>

        <section className="card cardAccentSoft" id="twp-schedule">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Scheduled & completed</h2>
            <Link to="/provider/schedule" className="pill pillRed" title="Open calendar">
              Calendar
            </Link>
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13 }}>
            Request received (Book Online, new): <b>{requestedCount}</b> · Scheduled (on this list): <b>{scheduledCount}</b> ·
            Completed: <b>{completedCount}</b> · Cancelled: <b>{cancelledCount}</b> · Total rows: <b>{scheduleApptsMerged.length}</b>
          </div>
          <div className="divider" />
          <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Search
              </div>
              <input
                className="input"
                value={apptQuery}
                onChange={(e) => setApptQuery(e.target.value)}
                placeholder="Name, type, date/time…"
                ref={scheduleSearchRef}
              />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Filter
              </div>
              <select className="select" value={apptFilter} onChange={(e) => setApptFilter(e.target.value as any)}>
                <option value="Scheduled">Scheduled + open requests</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <span className="pill">
              Showing: <b>{filteredAppts.length}</b>
            </span>
          </div>
          <div className="divider" />
          {filteredAppts.length === 0 ? (
            <p className="muted">No scheduled visits yet.</p>
          ) : (
            <div className="teamWidgetScroll">
              <div className="tableWrap">
              <table className="table" aria-label="Scheduled visits sample queue">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>When</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppts.map((a) => (
                    <tr key={a.id}>
                      <td className="muted">{rowPatientLabel(a)}</td>
                      <td>{a.type}</td>
                      <td className="muted">{a.when}</td>
                      <td>
                        {a.status === 'Requested' ? (
                          <span className="pill pillRed" title="From team inbox — use Mark handled there or add via Quick schedule">
                            Request received
                          </span>
                        ) : (
                          <select
                            className="select"
                            value={a.status}
                            onChange={(e) => {
                              const next = e.target.value as DemoAppt['status']
                              setAppts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: next } : x)))
                              const portalId = (a as any).portalApptId as string | undefined
                              if (portalId) {
                                if (next === 'Cancelled') {
                                  removeAppointment(portalId)
                                } else if (next === 'Completed') {
                                  updateAppointmentStatus(portalId, 'Completed')
                                } else if (next === 'Scheduled') {
                                  updateAppointmentStatus(portalId, 'Scheduled')
                                }
                              }
                            }}
                            style={{ padding: '8px 10px' }}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {a.status === 'Requested' ? (
                          <span className="muted" style={{ fontSize: 12 }}>
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn"
                            style={{ color: '#7a0f1c', borderColor: 'rgba(122, 15, 28, 0.35)' }}
                            onClick={() => {
                              if (!window.confirm('Remove this row from the preview list? (Only this browser; not the API inbox.)')) return
                              const portalId = (a as any).portalApptId as string | undefined
                              if (portalId) removeAppointment(portalId)
                              setAppts((prev) => prev.filter((x) => x.id !== a.id))
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </section>

        <section className="card cardAccentNavy cardSpan12" id="twp-quick-schedule">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Quick schedule</h2>
            <span className="pill">Add</span>
          </div>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
            People who used <strong>Book</strong> or <strong>Contact</strong> appear under &ldquo;From public
            requests.&rdquo; After you add them to your real calendar, pick one here to track the visit in this
            preview list—or use <strong>Add name by hand</strong> for a call, walk-in, or anyone not in the list.
          </p>
          <div className="divider" />
          <div className="formRow">
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Patient
              </div>
              <select
                className="select"
                value={qsPatient}
                onChange={(e) => setQsPatient(e.target.value)}
                style={{ opacity: qsCustomName.trim() ? 0.65 : 1 }}
                title={
                  qsCustomName.trim()
                    ? 'The text field Add name by hand is used for this add; clear it to use this dropdown.'
                    : undefined
                }
              >
                {inboxRequestPatients.length > 0 ? (
                  <optgroup label="From public requests (book & contact)">
                    {inboxRequestPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label="Sample">
                  {demoPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Visit type
              </div>
              <select className="select" value={qsType} onChange={(e) => setQsType(e.target.value as any)}>
                <option>New Patient Consultation</option>
                <option>Follow-Up Consultation</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              Add name by hand (optional)
            </div>
            <input
              className="input"
              value={qsCustomName}
              onChange={(e) => setQsCustomName(e.target.value)}
              placeholder="e.g. phone or walk-in — overrides Patient above if filled"
              autoComplete="name"
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
              When this field has text, it is used for the name on the list instead of the patient dropdown.
            </p>
          </label>
          <div className="formRow" style={{ marginTop: 12 }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Date
              </div>
              <input className="input" type="date" value={qsDate} onChange={(e) => setQsDate(e.target.value)} />
            </label>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Time
              </div>
              <input className="input" type="time" value={qsTime} onChange={(e) => setQsTime(e.target.value)} step={900} />
            </label>
          </div>
          <div className="btnRow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btnPrimary"
              style={{ width: '100%' }}
              onClick={() => {
                const custom = qsCustomName.trim()
                const date = qsDate.trim()
                const time = (qsTime || '').slice(0, 5)
                const whenText = date && time ? `${date} ${time}` : qsWhen.trim() || '—'
                if (custom) {
                  const portalApptId = date && time ? scheduleAppointment({ patientName: custom, type: qsType, date, time }) : undefined
                  setAppts((prev) => [
                    {
                      id: `a_${Math.random().toString(16).slice(2)}`,
                      portalApptId,
                      patientId: 'custom:local',
                      patientName: custom,
                      type: qsType,
                      when: whenText,
                      status: 'Scheduled',
                    } as any,
                    ...prev,
                  ])
                  setQsCustomName('')
                  return
                }
                const pl = allPatientOptions.find((p) => p.id === qsPatient)
                const nameSnap = (pl?.label || labelForPatientId(qsPatient)).trim() || '—'
                const portalApptId = date && time ? scheduleAppointment({ patientName: nameSnap, type: qsType, date, time }) : undefined
                setAppts((prev) => [
                  {
                    id: `a_${Math.random().toString(16).slice(2)}`,
                    portalApptId,
                    patientId: qsPatient,
                    patientName: nameSnap,
                    type: qsType,
                    when: whenText,
                    status: 'Scheduled',
                  },
                  ...prev,
                ])
              }}
            >
              Schedule
            </button>
          </div>
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Availability / Time off</h2>
            <span className="pill pillRed">Blackout</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Close full days or a specific time window. These remove slots from the booking calendar and weekly schedule.
          </p>
          <div className="divider" />
          <div className="formRow" style={{ gridTemplateColumns: '1fr 0.9fr 0.9fr', alignItems: 'end' }}>
            <label>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Date
              </div>
              <input className="input" type="date" value={timeOffDate} onChange={(e) => setTimeOffDate(e.target.value)} />
            </label>
            <label style={{ opacity: timeOffAllDay ? 0.55 : 1 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                Start
              </div>
              <input
                className="input"
                type="time"
                value={timeOffStart}
                disabled={timeOffAllDay}
                onChange={(e) => setTimeOffStart(e.target.value)}
              />
            </label>
            <label style={{ opacity: timeOffAllDay ? 0.55 : 1 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                End
              </div>
              <input
                className="input"
                type="time"
                value={timeOffEnd}
                disabled={timeOffAllDay}
                onChange={(e) => setTimeOffEnd(e.target.value)}
              />
            </label>
          </div>
          <div className="btnRow" style={{ marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="muted" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={timeOffAllDay} onChange={(e) => setTimeOffAllDay(e.target.checked)} />
              All day
            </label>
            <button
              type="button"
              className="btn btnAccent"
              onClick={() => {
                const date = timeOffDate.trim()
                if (!date) return
                if (timeOffAllDay) {
                  addBlackoutDate(date)
                } else {
                  addBlackoutBlock({ date, start: (timeOffStart || '').slice(0, 5), end: (timeOffEnd || '').slice(0, 5) })
                }
              }}
            >
              Add time off
            </button>
          </div>
          <div className="divider" />
          {blackouts.length === 0 && blackoutBlocks.length === 0 ? <p className="muted">No time off yet.</p> : null}
          {blackouts.length > 0 ? (
            <div className="tableWrap">
              <table className="table" aria-label="Closed full days">
                <thead>
                  <tr>
                    <th>Day closed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blackouts.map((d) => (
                    <tr key={d}>
                      <td className="muted">{d}</td>
                      <td>
                        <button type="button" className="btn" onClick={() => removeBlackoutDate(d)}>
                          Re-open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {blackoutBlocks.length > 0 ? (
            <div className="tableWrap" style={{ marginTop: 12 }}>
              <table className="table" aria-label="Closed hours">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours closed</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blackoutBlocks.map((b) => (
                    <tr key={`${b.date}_${b.start}_${b.end}`}>
                      <td className="muted">{b.date}</td>
                      <td className="muted">
                        {b.start}–{b.end}
                      </td>
                      <td>
                        <button type="button" className="btn" onClick={() => removeBlackoutBlock(b)}>
                          Re-open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Payments panel removed. */}

        <section className="card cardAccentSoft" id="twp-audit">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Audit log</h2>
            <div className="btnRow" style={{ margin: 0, flexWrap: 'wrap' }}>
              <span className="pill">Compliance</span>
              <Link to="/provider/audit" className="btn" style={{ textDecoration: 'none' }}>
                Full audit log
              </Link>
              <button type="button" className="btn" disabled={auditLoading || !hasApiCredential()} onClick={() => void loadAudit()}>
                {auditLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            Counts below are <strong>all-time</strong> totals from the database (provider-authenticated API only). Open the full
            log to browse recent events, search, and filter by type.
          </p>
          <div className="divider" />
          {auditError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, margin: '0 0 10px' }}>
              {auditError}
            </p>
          ) : null}
          {hasApiCredential() && !auditLoading && auditSummary !== null && auditSummary.total === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No audit events yet. Actions such as order updates, inbox handling, schedule changes, and profile edits appear here
              once recorded by the server.
            </p>
          ) : null}
          {auditSummary !== null && auditSummary.total > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                <strong>{auditSummary.total}</strong> audit events all-time.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1em', lineHeight: 1.65 }}>
                {auditSummary.byEntityType.map(({ entityType, count: n }) => (
                  <li key={entityType}>
                    <Link
                      to={`/provider/audit?entityType=${encodeURIComponent(entityType)}`}
                      className="teamWorkspaceStatPillLink"
                      style={{ fontWeight: 700 }}
                    >
                      {n} {auditEntityLabel(entityType)}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="btnRow" style={{ marginTop: 4 }}>
                <Link to="/provider/audit" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                  Open full audit log
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="card cardAccentRed" id="twp-orders">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Orders</h2>
            <div className="btnRow" style={{ margin: 0, flexWrap: 'wrap' }}>
              <span className="pill pillRed" title="New orders awaiting action">
                {ordersNewCount > 0 ? `${ordersNewCount} new` : 'Queue clear'}
              </span>
              <Link to="/provider/orders" className="btn" style={{ textDecoration: 'none' }}>
                All order history
              </Link>
              <button type="button" className="btn" disabled={ordersLoading || !hasApiCredential()} onClick={() => void loadOrders()}>
                {ordersLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divider" />
          {ordersError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, margin: '0 0 10px' }}>
              {ordersError}
            </p>
          ) : null}
          {hasApiCredential() && !ordersLoading && orders.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No patient-submitted orders yet. They appear when a patient completes checkout (with a signed order on the
              site) and you are on the <strong>same</strong> practice user the API assigned to the order.
            </p>
          ) : null}
          {orders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                Status labels below match the internal workflow on <strong>All orders</strong>. Open the full list to search, copy
                details, and update status.
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1em', lineHeight: 1.65 }}>
                <li>
                  <Link to="/provider/orders?orderFilter=new" className="teamWorkspaceStatPillLink" style={{ fontWeight: 700 }}>
                    {ordersNewCount} new (pending invoice / triage)
                  </Link>
                </li>
                <li>
                  <Link to="/provider/orders?orderFilter=in_review" className="teamWorkspaceStatPillLink" style={{ fontWeight: 700 }}>
                    {ordersInReviewCount} authorized / in review
                  </Link>
                </li>
                <li>
                  <Link to="/provider/orders?orderFilter=ordered" className="teamWorkspaceStatPillLink" style={{ fontWeight: 700 }}>
                    {ordersOrderedCount} invoice sent (ordered)
                  </Link>
                </li>
                <li>
                  <Link to="/provider/orders?orderFilter=closed" className="teamWorkspaceStatPillLink" style={{ fontWeight: 700 }}>
                    {ordersClosedCount} closed
                  </Link>
                </li>
                <li>
                  <Link to="/provider/orders?orderFilter=declined" className="teamWorkspaceStatPillLink" style={{ fontWeight: 700 }}>
                    {ordersDeclinedCount} declined
                  </Link>
                </li>
              </ul>
              <div className="btnRow" style={{ marginTop: 4 }}>
                <Link to="/provider/orders" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                  Open all orders
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        {/* Training/demo sandbox removed for production */}
      </div>
    </div>
  )
}
