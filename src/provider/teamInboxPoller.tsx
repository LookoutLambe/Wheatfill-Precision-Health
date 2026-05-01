import { useEffect, useRef, useState } from 'react'
import { apiGetWithSessionWarmup, hasApiCredential } from '../api/client'

/** Dispatched when `/v1/provider/team-inbox` gains new `status=new` rows since the previous poll. */
export const WPH_TEAM_INBOX_CHANGED = 'wph_team_inbox_changed'

export type TeamInboxChangedDetail = {
  newSinceLast: Array<{ id: string; kind: string; fromName: string }>
}

const POLL_MS = 25_000

export function formatInboxKind(kind: string): string {
  switch (kind) {
    case 'contact':
      return 'Contact'
    case 'online_booking':
      return 'Book online'
    case 'order_request':
      return 'Order request'
    default:
      return kind.replace(/_/g, ' ')
  }
}

export function requestInboxDesktopAlerts(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return Promise.resolve('denied')
  return Notification.requestPermission()
}

export function useTeamInboxPolling() {
  const baselineRef = useRef(true)
  const lastNewIdsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!hasApiCredential()) return

    const poll = async () => {
      if (!mountedRef.current || !hasApiCredential()) return
      try {
        const r = await apiGetWithSessionWarmup<{
          items: Array<{ id: string; kind: string; status: string; fromName: string }>
        }>('/v1/provider/team-inbox')
        if (!mountedRef.current) return

        const newRows = r.items.filter((i) => i.status === 'new')
        const newIds = new Set(newRows.map((i) => i.id))

        if (baselineRef.current) {
          lastNewIdsRef.current = newIds
          baselineRef.current = false
          return
        }

        const newSinceLast = newRows.filter((i) => !lastNewIdsRef.current.has(i.id))
        lastNewIdsRef.current = newIds
        if (newSinceLast.length === 0) return

        const detail: TeamInboxChangedDetail = {
          newSinceLast: newSinceLast.map((i) => ({
            id: i.id,
            kind: i.kind,
            fromName: (i.fromName || '').trim() || 'Unknown',
          })),
        }

        window.dispatchEvent(new CustomEvent<TeamInboxChangedDetail>(WPH_TEAM_INBOX_CHANGED, { detail }))

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            if (detail.newSinceLast.length === 1) {
              const row = detail.newSinceLast[0]
              new Notification('Wheatfill — new request', {
                body: `${formatInboxKind(row.kind)} · ${row.fromName}`.slice(0, 180),
                tag: `wph-inbox-${row.id}`,
              })
            } else {
              const kinds = detail.newSinceLast.map((r) => formatInboxKind(r.kind))
              new Notification(`Wheatfill — ${detail.newSinceLast.length} new requests`, {
                body: [...new Set(kinds)].join(' · ').slice(0, 180),
                tag: 'wph-inbox-batch',
              })
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // Transient API/network failures — next poll or visibility refresh will retry.
      }
    }

    void poll()
    const intervalId = window.setInterval(poll, POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      mountedRef.current = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}

export function ProviderDesktopAlertsControl() {
  const [perm, setPerm] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )

  if (typeof Notification === 'undefined') return null

  if (perm === 'granted') {
    return <span className="muted providerFooterAlertsStatus">Desktop alerts on</span>
  }
  if (perm === 'denied') {
    return (
      <span className="muted providerFooterAlertsStatus" title="Allow notifications for this site in browser settings.">
        Desktop alerts off
      </span>
    )
  }
  return (
    <button
      type="button"
      className="providerFooterAlertsBtn"
      onClick={() => {
        void requestInboxDesktopAlerts().then(setPerm)
      }}
    >
      Turn on desktop alerts
    </button>
  )
}
