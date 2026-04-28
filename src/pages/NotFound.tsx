import { Link } from 'react-router-dom'
import Page from '../components/Page'
import { SiteLogoPageBadge } from '../components/SiteLogo'

export default function NotFound() {
  return (
    <Page variant="prose">
      <div className="pageHeaderRow">
        <div>
          <SiteLogoPageBadge />
          <h1 style={{ margin: 0 }}>Page not found</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            That link may be out of date, or the page was moved. Try the home page or the patient hub.
          </p>
        </div>
        <div className="pageActions" style={{ flexWrap: 'wrap' }}>
          <Link to="/" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/patient" className="btn" style={{ textDecoration: 'none' }}>
            For patients
          </Link>
        </div>
      </div>
    </Page>
  )
}
