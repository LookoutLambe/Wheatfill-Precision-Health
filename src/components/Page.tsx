import type { CSSProperties, ReactNode } from 'react'

export type PageVariant = 'default' | 'wide' | 'prose' | 'full'

export default function Page({
  children,
  className,
  variant = 'default',
  style,
}: {
  children: ReactNode
  className?: string
  variant?: PageVariant
  style?: CSSProperties
}) {
  const v = variant ? `page--${variant}` : ''
  return (
    <div className={`page ${v}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}

