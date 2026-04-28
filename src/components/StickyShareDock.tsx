import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

function buildShareTargets(url: string, title: string) {
  const t = title.trim() || document.title || 'Wheatfill Precision Health'
  const u = url.trim()
  const text = `${t}\n${u}`
  return [
    {
      id: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
      className: 'stickyShareDockPill stickyShareDockPill--facebook',
    },
    {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
      className: 'stickyShareDockPill stickyShareDockPill--x',
    },
    {
      id: 'truth',
      label: 'Truth Social',
      href: `https://truthsocial.com/intent/post?text=${encodeURIComponent(text)}`,
      className: 'stickyShareDockPill stickyShareDockPill--truth',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
      className: 'stickyShareDockPill stickyShareDockPill--linkedin',
    },
    {
      id: 'reddit',
      label: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
      className: 'stickyShareDockPill stickyShareDockPill--reddit',
    },
    {
      id: 'pinterest',
      label: 'Pinterest',
      href: `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`,
      className: 'stickyShareDockPill stickyShareDockPill--pinterest',
    },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(`${u}\n\n${t}`)}`,
      className: 'stickyShareDockPill stickyShareDockPill--email',
    },
  ] as const
}

export default function StickyShareDock() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [snap, setSnap] = useState(() => ({
    url: typeof window !== 'undefined' ? window.location.href : '',
    title: typeof document !== 'undefined' ? document.title : '',
  }))

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setSnap({
        url: window.location.href,
        title: (document.title || '').trim() || 'Wheatfill Precision Health',
      })
    })
    return () => window.cancelAnimationFrame(id)
  }, [location.pathname, location.search, location.hash])

  const targets = useMemo(() => buildShareTargets(snap.url, snap.title), [snap.url, snap.title])

  const onCopy = useCallback(async () => {
    const u = snap.url
    if (!u) return
    try {
      await navigator.clipboard.writeText(u)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }, [snap.url])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: snap.title,
        text: snap.title,
        url: snap.url,
      })
      setOpen(false)
    } catch {
      /* user cancelled or share failed */
    }
  }, [snap.title, snap.url])

  return (
    <div className="stickyShareDock noPrint" aria-live="polite">
      {open ? (
        <div id="sticky-share-panel" className="stickyShareDockPanel" role="dialog" aria-modal="false" aria-label="Share this page">
          <div className="stickyShareDockPanelTitle">Share</div>
          <div className="stickyShareDockGrid">
            {targets.map((x) => (
              <a
                key={x.id}
                href={x.href}
                target="_blank"
                rel="noopener noreferrer"
                className={x.className}
              >
                <span className="stickyShareDockPillIcon" aria-hidden="true">
                  {x.id === 'facebook'
                    ? 'f'
                    : x.id === 'x'
                      ? '𝕏'
                      : x.id === 'truth'
                        ? 'T'
                        : x.id === 'linkedin'
                          ? 'L'
                          : x.id === 'reddit'
                            ? '◎'
                            : x.id === 'pinterest'
                              ? 'P'
                              : '✉'}
                </span>
                <span className="stickyShareDockPillLabel">{x.label}</span>
              </a>
            ))}
            <button type="button" className="stickyShareDockPill stickyShareDockPill--copy" onClick={() => void onCopy()}>
              <span className="stickyShareDockPillIcon" aria-hidden="true">
                ⧉
              </span>
              <span className="stickyShareDockPillLabel">{copied ? 'Copied' : 'Copy link'}</span>
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
              <button type="button" className="stickyShareDockPill stickyShareDockPill--native" onClick={() => void nativeShare()}>
                <span className="stickyShareDockPillIcon" aria-hidden="true">
                  ↗
                </span>
                <span className="stickyShareDockPillLabel">More…</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="stickyShareDockFab"
        aria-expanded={open}
        aria-controls={open ? 'sticky-share-panel' : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="stickyShareDockFabIcon" aria-hidden="true">
          ⇪
        </span>
        <span className="stickyShareDockFabText">Share</span>
      </button>
    </div>
  )
}
