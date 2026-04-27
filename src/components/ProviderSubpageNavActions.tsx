import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/** Sits in page body (not the shell header): back to /provider hub, then public site, then optional extra controls. */
export function ProviderSubpageNavActions({ children, className = 'pageActions', style }: Props) {
  return (
    <div className={className} style={style}>
      <Link to="/provider" className="btn" style={{ textDecoration: 'none' }}>
        ← Back to team workspace
      </Link>
      <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
        Public site
      </Link>
      {children}
    </div>
  )
}
