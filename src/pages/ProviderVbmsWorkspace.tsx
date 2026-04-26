import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { apiDelete, apiGet, apiPatch, apiPost, getToken } from '../api/client'
import { CATALOG_PAYPAL, STRIPE_CHECKOUT_URL } from '../config/provider'
import { PROVIDER_TEAM_LABEL } from '../config/provider'
import {
  addBlackoutDate,
  getPortalState,
  removeAppointment,
  removeBlackoutDate,
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

type P2pPaymentRow = {
  id: string
  method: string
  status: string
  amountCents: number
  currency: string
  p2pMemo: string | null
  createdAt: string
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

export default function ProviderVbmsWorkspace() {
  const navigate = useNavigate()
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
  const [msgs, setMsgs] = useState<DemoMsg[]>([])
  const [inboxNameCache, setInboxNameCache] = useState<Record<string, string>>(() => initialWs.inboxNameCache)
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [inboxLoading, setInboxLoading] = useState(false)
  const [p2pItems, setP2pItems] = useState<P2pPaymentRow[]>([])
  const [p2pLoading, setP2pLoading] = useState(false)
  const [p2pError, setP2pError] = useState<string | null>(null)
  const [p2pDollars, setP2pDollars] = useState('')
  const [p2pMethod, setP2pMethod] = useState<'paypal'>('paypal')
  const [p2pMemo, setP2pMemo] = useState('')
  const [p2pRecording, setP2pRecording] = useState(false)
  const [blackouts, setBlackouts] = useState<string[]>(() => getPortalState().blackoutDates || [])

  const [inboxQuery, setInboxQuery] = useState('')
  const [inboxFilter, setInboxFilter] = useState<'all' | 'new' | 'handled'>('new')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState<'all' | 'new' | 'in_review' | 'ordered' | 'closed'>('new')
  const [apptQuery, setApptQuery] = useState('')
  const [apptFilter, setApptFilter] = useState<'all' | 'Scheduled' | 'Completed' | 'Cancelled'>('Scheduled')

  const [qsPatient, setQsPatient] = useState(initialWs.qsPatient)
  const [qsCustomName, setQsCustomName] = useState(initialWs.qsCustomName)
  const [qsType, setQsType] = useState<'New Patient Consultation' | 'Follow-Up Consultation'>(initialWs.qsType)
  const [qsWhen, setQsWhen] = useState(initialWs.qsWhen)
  const [qsDate, setQsDate] = useState(() => (initialWs.qsWhen || '').slice(0, 10) || new Date().toISOString().slice(0, 10))
  const [qsTime, setQsTime] = useState('09:00')

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
    const sync = () => setBlackouts(getPortalState().blackoutDates || [])
    sync()
    return subscribePortalState(sync)
  }, [])

  useEffect(() => {
    if (!isMarketingProviderAuthed()) {
      navigate('/provider/login', { replace: true })
      return
    }
    // Staff login stores a JWT for the API; inbox/orders need it on every deploy (including static marketing).
    if (!getToken()) {
      setMarketingProviderAuthed(false)
      navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
    }
  }, [navigate])

  const loadTeamInbox = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setInboxError(
        'Sign in again to load the inbox. Your team password gives you a session on this site—no separate API key.',
      )
      setMsgs([])
      return
    }
    setInboxLoading(true)
    setInboxError(null)
    try {
      const r = await apiGet<{
        items: Array<{
          id: string
          kind: string
          status: string
          fromName: string
          fromEmail: string
          body: string
          createdAt: string
        }>
      }>('/v1/provider/team-inbox', tok)
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
        setInboxError('Session expired. Sign in again on the provider login page.')
        setMarketingProviderAuthed(false)
        navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
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

  useEffect(() => {
    const sync = () => {
      if (getToken()) void loadTeamInbox()
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
  }, [loadTeamInbox])

  const loadP2pPayments = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setP2pItems([])
      return
    }
    setP2pLoading(true)
    setP2pError(null)
    try {
      const r = await apiGet<{ items: P2pPaymentRow[] }>('/v1/provider/p2p-payments', tok)
      setP2pItems(r.items || [])
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        setP2pError('Sign in again to load recorded payments.')
        setMarketingProviderAuthed(false)
        navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
      } else {
        setP2pError(msg)
        setP2pItems([])
      }
    } finally {
      setP2pLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (isMarketingProviderAuthed()) void loadP2pPayments()
  }, [loadP2pPayments])

  const loadOrders = useCallback(async () => {
    const tok = getToken()
    if (!tok) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const r = await apiGet<{ orders: ProviderOrderRow[] }>('/v1/provider/orders', tok)
      setOrders(
        (r.orders || []).map((o) => ({
          ...o,
          createdAt: typeof o.createdAt === 'string' ? o.createdAt : (o as any).createdAt,
        })),
      )
    } catch (e: any) {
      const msg = String(e?.message || e)
      if (/401|unauthorized|Unauthorized/i.test(msg)) {
        setOrdersError('Session expired. Sign in again.')
        setMarketingProviderAuthed(false)
        navigate('/provider/login?next=' + encodeURIComponent('/provider'), { replace: true })
      } else {
        setOrdersError(msg)
        setOrders([])
      }
    } finally {
      setOrdersLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    if (isMarketingProviderAuthed()) void loadOrders()
  }, [loadOrders])

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

  /**
   * Inbox rows plus cached names for messages that were deleted on the server but are still
   * referenced in the preview schedule or Quick schedule.
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
    const activeIds = new Set(msgs.map((m) => m.id))
    const fromCache: DemoPatient[] = Object.keys(inboxNameCache)
      .filter((id) => !activeIds.has(id) && (inboxNameCache[id] || '').trim().length > 0)
      .map((id) => ({ id: `inbox:${id}`, label: inboxNameCache[id] }))
    return [...fromMsgs, ...fromCache]
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

  const formatOrderPatient = (o: ProviderOrderRow) => {
    const p = o.patient
    const n = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim()
    if (n) return n
    if (p?.displayName?.trim()) return p.displayName.trim()
    if (p?.email?.trim()) return p.email.trim()
    return p?.id ? `${p.id.slice(0, 8)}…` : '—'
  }

  const formatShipTo = (o: ProviderOrderRow) => {
    const line1 = (o.shippingAddress1 || '').trim()
    const line2 = (o.shippingAddress2 || '').trim()
    const citySt = [o.shippingCity, o.shippingState, o.shippingPostalCode].filter((x) => (x || '').trim()).join(', ')
    const parts = [line1, line2, citySt, (o.shippingCountry || '').trim() && o.shippingCountry !== 'US' ? o.shippingCountry : ''].filter(
      Boolean,
    ) as string[]
    return parts.length ? parts.join(' · ') : '—'
  }

  const orderLineItemsSummary = (o: ProviderOrderRow) =>
    o.items.length
      ? o.items.map((it) => `${it.name} (×${it.quantity})`).join(' · ')
      : o.request || o.item || '—'

  const orderSubtotalCents = (o: ProviderOrderRow) =>
    o.items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0)

  const updateOrderStatus = async (id: string, status: 'new' | 'in_review' | 'ordered' | 'closed') => {
    const tok = getToken()
    if (!tok) return
    setOrdersError(null)
    try {
      await apiPatch(`/v1/provider/orders/${encodeURIComponent(id)}/status`, { status }, tok)
      await loadOrders()
    } catch (e: any) {
      setOrdersError(String(e?.message || e))
    }
  }

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

  const orderTokens = useMemo(() => norm(orderQuery).split(' ').filter(Boolean), [orderQuery])
  const filteredOrders = useMemo(() => {
    const base = orderFilter === 'all' ? orders : orders.filter((o) => o.status === orderFilter)
    if (orderTokens.length === 0) return base
    return base.filter((o) =>
      includesAll(
        [
          orderLineItemsSummary(o),
          formatOrderPatient(o),
          o.patient?.email || '',
          formatShipTo(o),
          o.status,
          o.pharmacyPartner?.name || '',
          o.createdAt,
        ]
          .filter(Boolean)
          .join(' | '),
        orderTokens,
      ),
    )
  }, [orderFilter, orderTokens, orders])

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
        <div className="teamWorkspaceIntro">
          <p>
            {PROVIDER_TEAM_LABEL} — tools for the public marketing site, not a full clinical or ops app. Open the
            inbox below to see who reached out from the contact and booking pages.
          </p>
          <p>
            <strong>Inbox</strong> messages live on the <strong>API</strong> (database). <strong>Quick schedule</strong>{' '}
            and the rows you add there are stored in <strong>this browser</strong>. New <strong>Book Online</strong>{' '}
            requests also appear in <strong>Scheduled &amp; completed</strong> as &ldquo;Request received&rdquo; until you
            add the same person from the inbox via Quick schedule or mark the inbox row handled.
          </p>
        </div>
        <div className="teamWorkspaceToolbar" style={{ paddingTop: 0 }}>
          <span className="pill" title="Inbox messages from the public site">
            Inbox: <b>{newCount}</b> new · <span className="muted">{handledCount} handled</span>
          </span>
          <span className="pill" title="Booking requests (from Book Online)">
            Booking requests: <b>{bookingNewCount}</b> new · <span className="muted">{bookingHandledCount} handled</span>
          </span>
          <span className="pill" title="Preview schedule rows (this browser)">
            Visits: <b>{scheduledCount}</b> scheduled · <span className="muted">{completedCount} completed</span>
          </span>
          <span className="pill" title="Order Now checkouts (API)">
            Orders: <b>{ordersNewCount}</b> new · <span className="muted">{ordersInReviewCount} in review</span>
          </span>
        </div>
        <div className="teamWorkspaceToolbar" role="toolbar" aria-label="Workspace shortcuts">
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
            Home
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
            {ordersNewCount > 0 ? <span className="pill pillRed">{ordersNewCount} new</span> : <span className="pill">Queue</span>}
          </div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
            Quick links for day-to-day requests from patients: booking/time requests, order requests, and the full weekly schedule.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => document.getElementById('wph-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              View order requests
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => document.getElementById('wph-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              View inbox
            </button>
            <Link to="/provider/schedule" className="btn" style={{ textDecoration: 'none' }}>
              Weekly schedule
            </Link>
            <Link to="/ordering" className="btn" style={{ textDecoration: 'none' }}>
              Patient order page
            </Link>
          </div>
        </section>

        <section className="card cardAccentSoft" id="wph-inbox">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Inbox</h2>
            {newCount > 0 ? <span className="pill pillRed">{newCount} new</span> : <span className="pill">Inbox</span>}
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
              disabled={inboxLoading || !getToken()}
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
          {getToken() && filteredMsgs.length === 0 && msgs.length === 0 && !inboxError ? (
            <p className="muted">No messages yet. New contact and time-request form alerts will list here.</p>
          ) : null}
          {getToken() && filteredMsgs.length === 0 && msgs.length > 0 ? (
            <p className="muted">No messages match your search/filter.</p>
          ) : null}
          {getToken() && filteredMsgs.length > 0 ? (
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
                                document.getElementById('wph-quick-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                            >
                              Preselect
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn"
                            disabled={m.status === 'handled' || !getToken()}
                            style={{ opacity: m.status === 'handled' ? 0.6 : 1 }}
                            onClick={() => {
                              ;(async () => {
                                const tok = getToken()
                                if (!tok) return
                                try {
                                  await apiPatch(
                                    `/v1/provider/team-inbox/${encodeURIComponent(m.id)}`,
                                    { status: 'handled' },
                                    tok,
                                  )
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
                            disabled={!getToken()}
                            onClick={() => {
                              if (!getToken()) return
                              if (!window.confirm('Delete this request from the inbox? This cannot be undone.')) return
                              ;(async () => {
                                const tok = getToken()
                                if (!tok) return
                                try {
                                  setInboxError(null)
                                  await apiDelete<{ ok: boolean }>(
                                    `/v1/provider/team-inbox/${encodeURIComponent(m.id)}`,
                                    tok,
                                  )
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
          ) : null}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Scheduled & completed</h2>
            <Link to="/provider/schedule" className="pill pillRed" style={{ textDecoration: 'none' }}>
              Manage
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
          )}
        </section>

        <section className="card cardAccentNavy cardSpan12" id="wph-quick-schedule">
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
            Close dates (preview). In production these remove slots from the booking calendar.
          </p>
          <div className="divider" />
          <div className="btnRow">
            <button
              type="button"
              className="btn btnAccent"
              onClick={() => {
                const d = new Date()
                const iso = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                addBlackoutDate(iso)
              }}
            >
              Add blackout (preview)
            </button>
          </div>
          <div className="divider" />
          {blackouts.length === 0 ? (
            <p className="muted">No closed dates yet.</p>
          ) : (
            <div className="tableWrap">
              <table className="table" aria-label="Blackout dates">
                <thead>
                  <tr>
                    <th>Date</th>
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
          )}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Payments (preview)</h2>
            <span className="pill">Check out · P2P log</span>
          </div>
          <div className="divider" />
          <p className="muted">
            <strong>Check out</strong> opens the payment link you configured for patients (Stripe card link, if set).
            <strong> Zelle</strong> is still available from the link below. Stripe Checkout sessions (when enabled) are
            recorded automatically; PayPal (if you ever add it) can be logged manually here.
          </p>
          <VenmoPayToHint style={{ marginTop: 10 }} />
          <div className="divider" />
          {CATALOG_PAYPAL ? (
            <>
              <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
                <strong>Record a payment you already received</strong> (after the fact; not automatic).
              </p>
              <div className="formRow" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Amount (USD)
                  </div>
                  <input
                    className="input"
                    value={p2pDollars}
                    onChange={(e) => setP2pDollars(e.target.value)}
                    placeholder="e.g. 125.00"
                    inputMode="decimal"
                    style={{ minWidth: 120 }}
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    How they paid
                  </div>
                  <select className="select" value={p2pMethod} onChange={(e) => setP2pMethod(e.target.value as 'paypal')}>
                    <option value="paypal">{CATALOG_PAYPAL.label}</option>
                  </select>
                </label>
                <label style={{ flex: '1 1 200px' }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Note (optional)
                  </div>
                  <input
                    className="input"
                    value={p2pMemo}
                    onChange={(e) => setP2pMemo(e.target.value)}
                    placeholder="Name, order ref, etc."
                    style={{ width: '100%' }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={p2pRecording || !getToken()}
                  onClick={() => {
                    const raw = p2pDollars.replace(/[$,\s]/g, '').trim()
                    const n = parseFloat(raw)
                    if (!Number.isFinite(n) || n <= 0) {
                      setP2pError('Enter a valid amount greater than zero.')
                      return
                    }
                    const amountCents = Math.round(n * 100)
                    if (amountCents < 1) {
                      setP2pError('Amount is too small.')
                      return
                    }
                    setP2pError(null)
                    setP2pRecording(true)
                    ;(async () => {
                      const tok = getToken()
                      if (!tok) return
                      try {
                        await apiPost(
                          '/v1/provider/p2p-payments',
                          {
                            method: p2pMethod,
                            amountCents,
                            memo: p2pMemo.trim() || undefined,
                          },
                          tok,
                        )
                        setP2pDollars('')
                        setP2pMemo('')
                        await loadP2pPayments()
                      } catch (e: any) {
                        setP2pError(String(e?.message || e))
                      } finally {
                        setP2pRecording(false)
                      }
                    })()
                  }}
                >
                  {p2pRecording ? 'Saving…' : 'Record payment'}
                </button>
              </div>
            </>
          ) : STRIPE_CHECKOUT_URL ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
              Stripe card payments are tracked automatically in the API when patients complete checkout.
            </p>
          ) : null}
          {p2pError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, marginTop: 8, marginBottom: 0 }}>
              {p2pError}
            </p>
          ) : null}
          <div className="divider" />
          {CATALOG_PAYPAL ? (
            <>
              <div className="btnRow" style={{ marginBottom: 8 }}>
                <button type="button" className="btn" disabled={p2pLoading || !getToken()} onClick={() => void loadP2pPayments()}>
                  {p2pLoading ? 'Loading…' : 'Refresh list'}
                </button>
              </div>
              {p2pItems.length === 0 && !p2pLoading ? (
                <p className="muted" style={{ margin: 0 }}>
                  No payments logged yet. Log any PayPal payments here after you see them in your app.
                </p>
              ) : null}
              {p2pItems.length > 0 ? (
                <div className="tableWrap">
                  <table className="table" aria-label="Recorded PayPal payments">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Note</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p2pItems.map((row) => (
                        <tr key={row.id}>
                          <td className="muted">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="muted">
                            {row.method === 'manual_paypal' ? (CATALOG_PAYPAL?.label || 'PayPal') : row.method}
                          </td>
                          <td>
                            {((row.amountCents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                          </td>
                          <td>{row.p2pMemo || '—'}</td>
                          <td className="muted">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="card cardAccentSoft">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Audit log</h2>
            <span className="pill">Compliance</span>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0 }}>
            In production, every action writes an audit event.
          </p>
          <div className="divider" />
          <p className="muted" style={{ margin: 0 }}>
            No audit events yet.
          </p>
        </section>

        <section className="card cardAccentRed" id="wph-orders">
          <div className="cardTitle">
            <h2 style={{ margin: 0 }}>Orders</h2>
            <div className="btnRow" style={{ margin: 0 }}>
              {ordersNewCount > 0 ? <span className="pill pillRed">{ordersNewCount} new</span> : <span className="pill pillRed">Order Now</span>}
              <button type="button" className="btn" disabled={ordersLoading || !getToken()} onClick={() => void loadOrders()}>
                {ordersLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divider" />
          <p className="muted" style={{ marginTop: 0, fontSize: 14, lineHeight: 1.45 }}>
            When a patient checks out on the <strong>Order Now</strong> catalog (signed in), their <strong>line items</strong>,{' '}
            <strong>ship-to</strong>, and <strong>agreements / typed signature</strong> are stored on the API and show here
            so the team knows exactly what to place and where to send it. Update status as you work the order.
          </p>
          <div className="divider" />
          {ordersError ? (
            <p className="muted" style={{ color: '#7a0f1c', fontWeight: 700, margin: '0 0 10px' }}>
              {ordersError}
            </p>
          ) : null}
          {getToken() && !ordersLoading && orders.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No patient-submitted orders yet. They appear when a patient completes checkout (with a signed order on the
              site) and you are on the <strong>same</strong> practice user the API assigned to the order.
            </p>
          ) : null}
          {orders.length > 0 ? (
            <>
              <div className="formRow" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'end' }}>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Search
                  </div>
                  <input
                    className="input"
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Patient, address, SKU, keyword…"
                  />
                </label>
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Filter
                  </div>
                  <select className="select" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value as any)}>
                    <option value="new">new</option>
                    <option value="in_review">in review</option>
                    <option value="ordered">ordered</option>
                    <option value="closed">closed</option>
                    <option value="all">all</option>
                  </select>
                </label>
              </div>
              <div className="btnRow" style={{ marginTop: 12 }}>
                <span className="pill">
                  Showing: <b>{filteredOrders.length}</b>
                </span>
              </div>
              <div className="divider" />
            </>
          ) : null}
          {filteredOrders.length > 0 ? (
            <div
              className="vbmsOrderList"
              style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}
            >
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="card cardAccentSoft"
                  style={{ margin: 0, boxShadow: 'none', border: '1px solid rgba(10, 30, 63, 0.12)' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-h)' }}>{orderLineItemsSummary(o)}</div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {new Date(o.createdAt).toLocaleString()} · {o.pharmacyPartner ? o.pharmacyPartner.name : o.request}
                      </div>
                    </div>
                    <label className="muted" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      Status
                      <select
                        className="select"
                        value={o.status}
                        onChange={(e) =>
                          void updateOrderStatus(o.id, e.target.value as 'new' | 'in_review' | 'ordered' | 'closed')
                        }
                        aria-label={`Status for order ${o.id}`}
                      >
                        <option value="new">new</option>
                        <option value="in_review">in review</option>
                        <option value="ordered">ordered</option>
                        <option value="closed">closed</option>
                      </select>
                    </label>
                  </div>
                  <div className="divider" style={{ margin: '12px 0' }} />
                  <div className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    <div>
                      <strong>Patient</strong> — {formatOrderPatient(o)}
                      {o.patient?.email ? (
                        <span>
                          {' '}
                          · <a href={`mailto:${o.patient.email}`}>{o.patient.email}</a>
                        </span>
                      ) : null}
                      {o.patient?.phone ? <span> · {o.patient.phone}</span> : null}
                    </div>
                    {o.items.length > 0 ? (
                      <div style={{ marginTop: 8 }}>
                        <strong>Subtotal (listed)</strong> —{' '}
                        {(orderSubtotalCents(o) / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                        {o.shippingInsuranceCents > 0 ? (
                          <span> · insurance {(o.shippingInsuranceCents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8 }}>
                      <strong>Ship to</strong> — {formatShipTo(o)}
                    </div>
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(10, 30, 63, 0.04)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 13, color: 'var(--navy)' }}>
                        Consents and signature (for fulfillment)
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.1em', lineHeight: 1.5 }}>
                        <li>
                          Medication shipping terms: <strong>{o.agreedToShippingTerms ? 'Agreed' : '—'}</strong>
                        </li>
                        <li>
                          Contact for order: <strong>{o.contactPermission ? 'Authorized' : '—'}</strong>
                        </li>
                        <li>
                          Typed signature: <strong>{(o.signatureName || '').trim() || '—'}</strong>
                          {o.signatureDate
                            ? ` · ${new Date(o.signatureDate).toLocaleDateString()}`
                            : ' · (no date)'}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Training/demo sandbox removed for production */}
      </div>
    </div>
  )
}
