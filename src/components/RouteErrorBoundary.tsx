import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

/**
 * Catches render errors and failed lazy-route imports so users see a recovery UI instead of a blank screen.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Something went wrong.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="card cardAccentRed" style={{ maxWidth: 560, margin: '24px auto' }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>This page couldn’t load</h1>
            <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
              {this.state.message}
            </p>
            <div className="btnRow" style={{ marginTop: 16, flexWrap: 'wrap' }}>
              <button type="button" className="btn btnPrimary" onClick={() => window.location.reload()}>
                Reload
              </button>
              <a className="btn" href="/" style={{ textDecoration: 'none' }}>
                Home
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
