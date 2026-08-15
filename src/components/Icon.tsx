import type { ReactElement, SVGProps } from 'react'

/**
 * Lightweight inline line-icon set (Lucide-style). Icons inherit `currentColor` and scale with `size`.
 * Replaces emoji across the marketing UI for a consistent, professional look.
 */
export type IconName =
  | 'truck'
  | 'tag'
  | 'target'
  | 'ban'
  | 'check'
  | 'calendar'
  | 'trash'
  | 'mail'
  | 'share'
  | 'pulse'
  | 'shield'

const PATHS: Record<IconName, ReactElement> = {
  truck: (
    <>
      <path d="M1.5 5.5h12v9h-12z" />
      <path d="M13.5 8h4l3 3v3.5h-7z" />
      <circle cx="5.5" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.3" cy="7.3" r="1.1" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.7" y1="5.7" x2="18.3" y2="18.3" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.6 2.6L16.2 9.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 3v3M16 3v3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6.5 7l1 13h9l1-13" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V3.5" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </>
  ),
  pulse: (
    <>
      <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.5 20 6v5c0 5-3.4 8.6-8 10.5C7.4 19.6 4 16 4 11V6Z" />
      <path d="M9 12l2 2 4-4.5" />
    </>
  ),
}

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
}

export default function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
