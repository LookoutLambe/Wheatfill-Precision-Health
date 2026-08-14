/**
 * Lightweight scroll-reveal: fades/slides major content blocks in as they enter the viewport.
 * Pure IntersectionObserver + CSS (no dependency), and fully disabled under prefers-reduced-motion.
 *
 * Call `initScrollReveal()` after each route render; it tags a curated set of blocks with
 * `.wphReveal`, staggers siblings, and observes them. Returns a cleanup function.
 */

const REVEAL_SELECTORS = [
  '.page > section',
  '.page > .card',
  '.cardGrid > .card',
  '.landingTeamGrid > .landingTeamMember',
  '.landingAccordionCard',
  '.landingStepsList > li',
  '.landingPriceTable',
  '.landingPenPromo',
  '.landingConsultBand',
].join(',')

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function initScrollReveal(): () => void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {}

  const main = document.querySelector('main.main')
  if (!main) return () => {}

  const els = Array.from(main.querySelectorAll<HTMLElement>(REVEAL_SELECTORS))
  if (els.length === 0) return () => {}

  // Reduced motion (or no support): show everything immediately, no animation.
  if (prefersReducedMotion()) {
    els.forEach((el) => el.classList.add('wphReveal', 'is-visible'))
    return () => {}
  }

  // Stagger reveals among siblings for a choreographed cascade.
  const groupCounter = new Map<Element, number>()
  els.forEach((el) => {
    el.classList.add('wphReveal')
    const parent = el.parentElement
    if (parent) {
      const i = groupCounter.get(parent) ?? 0
      groupCounter.set(parent, i + 1)
      // Cap the stagger so long lists don't wait too long.
      el.style.setProperty('--wph-reveal-delay', `${Math.min(i, 6) * 70}ms`)
    }
  })

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )

  // Elements already within the viewport reveal synchronously (same frame as .wphReveal) so they
  // never paint at opacity:0 — no load flash. Everything below the fold animates in on scroll.
  const vh = window.innerHeight || document.documentElement.clientHeight
  els.forEach((el) => {
    const rect = el.getBoundingClientRect()
    if (rect.top < vh * 0.92 && rect.bottom > 0) {
      el.classList.add('is-visible')
    } else {
      observer.observe(el)
    }
  })

  return () => observer.disconnect()
}
