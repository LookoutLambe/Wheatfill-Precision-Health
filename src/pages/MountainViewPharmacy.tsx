import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import { bumpCartSku, countCartItems } from '../lib/pharmacyCart'
import CatalogProductDosingHint from '../components/CatalogProductDosingHint'

const SLUG = DEFAULT_CATALOG_PARTNER_SLUG
const PARTNER = resolvedFulfillmentPharmacyName()

function moneyWhole(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function groupByFamily() {
  const t = CATALOG_HIGHLIGHT_PRODUCTS.filter((p) => p.family === 'tirzepatide')
  const s = CATALOG_HIGHLIGHT_PRODUCTS.filter((p) => p.family === 'semaglutide')
  return { tirzepatide: t, semaglutide: s }
}

export default function MountainViewPharmacy() {
  const [cartCount, setCartCount] = useState(() => countCartItems(SLUG))
  const [announce, setAnnounce] = useState('')
  const baseId = useId()
  const { tirzepatide, semaglutide } = groupByFamily()

  const onAdd = useCallback((sku: string, label: string) => {
    bumpCartSku(SLUG, sku, 1)
    setCartCount(countCartItems(SLUG))
    setAnnounce(`Added ${label} to your cart.`)
  }, [])

  useEffect(() => {
    const sync = () => setCartCount(countCartItems(SLUG))
    window.addEventListener('wph_pharmacy_cart', sync)
    return () => window.removeEventListener('wph_pharmacy_cart', sync)
  }, [])

  return (
    <div className="page mountainViewPharmacyPage">
      <a href="#mountainview-main" className="mountainViewSkip">
        Skip to product list
      </a>

      <nav className="mountainViewBreadcrumb" aria-label="Breadcrumb">
        <ol className="mountainViewBreadcrumbList">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li aria-hidden="true"> / </li>
          <li>
            <Link to="/order-now">Order Now</Link>
          </li>
          <li aria-hidden="true"> / </li>
          <li aria-current="page">{PARTNER}</li>
        </ol>
      </nav>

      <header className="mountainViewHeader">
        <h1 className="mountainViewH1" id="mountainview-heading">
          {PARTNER}
        </h1>
        <p className="muted mountainViewLead">
          Representative GLP-1 vial SKUs and <strong>list prices</strong> for the compounding menu fulfilled through{' '}
          {PARTNER} when your clinician prescribes. You place orders with {PRACTICE_PUBLIC_NAME} on this site—not
          directly with the pharmacy website.
        </p>
        <div className="btnRow mountainViewCtas" style={{ flexWrap: 'wrap' }}>
          <Link
            to={`/order-now/${SLUG}`}
            className="btn btnPrimary"
            style={{ textDecoration: 'none' }}
            aria-describedby="mountainview-heading"
          >
            Open full catalog
          </Link>
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 10, marginBottom: 0, maxWidth: 720 }}>
          Use the <strong>bag in the site header</strong> to open your cart—same list as the full catalog. Prices mirror
          a typical posted menu. Your care team confirms the amount before you pay (PayPal, Zelle, or Stripe) as
          instructed.
        </p>
        {cartCount > 0 ? (
          <p className="muted" style={{ fontSize: 14, marginTop: 8, marginBottom: 0, maxWidth: 720 }} aria-live="polite">
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag—click the header bag to check out.
          </p>
        ) : null}
      </header>

      {announce ? (
        <div
          className="mountainViewLive"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          id={`${baseId}-live`}
        >
          {announce}
        </div>
      ) : null}

      <p className="srOnly" id="mountainview-table-hint">
        The following tables list product name, description, list price, and an add to cart button. Use Tab to move
        through the table. Scroll horizontally on small screens if needed.
      </p>
      <main
        id="mountainview-main"
        tabIndex={-1}
        aria-labelledby="mountainview-heading"
        className="mountainViewMain"
        aria-describedby="mountainview-table-hint"
      >
        {(
          [
            { key: 'tirzepatide' as const, label: 'Tirzepatide vials', rows: tirzepatide },
            { key: 'semaglutide' as const, label: 'Semaglutide vials', rows: semaglutide },
          ] as const
        ).map((section) => {
          const sectionId = `${baseId}-sec-${section.key}`
          return (
            <section key={section.key} className="mountainViewSection card cardAccentSoft" aria-labelledby={sectionId}>
              <h2 className="mountainViewH2" id={sectionId}>
                {section.label}
              </h2>
              <div className="mountainViewTableWrap" role="region" aria-label={`${section.label} price list`} tabIndex={0}>
                <table className="mountainViewTable">
                  <caption className="mountainViewCaption">
                    {section.label} — compounding with B6 and glycine as listed. The <strong>Per vial</strong> column
                    shows total mg of drug in the vial (mg/mL × mL) and approximate list price per mg for comparison
                    only. For titration education, use the <Link to="/medications#dosing-guide">dosing guide</Link>.
                    Clinical decisions are separate from list prices.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Description</th>
                      <th scope="col">Per vial</th>
                      <th scope="col">List price</th>
                      <th scope="col">
                        <span className="mountainViewActionHead">Add</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((p) => {
                      return (
                        <tr key={p.sku}>
                          <th scope="row" className="mountainViewProductName" data-label="Product">
                            {p.name}
                          </th>
                          <td className="muted mountainViewSub" data-label="Description">
                            {p.subtitle}
                          </td>
                          <td className="mountainViewDosingCell" data-label="Per vial">
                            <CatalogProductDosingHint name={p.name} priceCents={p.priceCents} layout="band" />
                          </td>
                          <td className="mountainViewPrice" aria-label={`List price ${moneyWhole(p.priceCents)}`} data-label="List price">
                            {moneyWhole(p.priceCents)}
                          </td>
                          <td data-label="Add">
                            <button
                              type="button"
                              className="btn btnPrimary mountainViewAddBtn"
                              onClick={() => onAdd(p.sku, p.name)}
                              aria-label={`Add ${p.name} for ${moneyWhole(p.priceCents)} to cart for ${PRACTICE_PUBLIC_NAME}`}
                            >
                              Add to cart
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </main>

      <section className="card cardAccentNavy mountainViewNext" aria-labelledby="mountainview-next-heading">
        <h2 className="mountainViewH2" id="mountainview-next-heading" style={{ margin: 0 }}>
          Next steps
        </h2>
        <p className="muted" style={{ marginTop: 10, marginBottom: 0, maxWidth: 720 }}>
          Review acknowledgments, contact details, and PayPal payment on the order summary. Questions—use{' '}
          <Link to="/contact">Contact</Link> or the paths on the <Link to="/patient">For patients</Link> page.
        </p>
        <div className="btnRow" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
            All Order Now options
          </Link>
          <Link to={`/order-now/${SLUG}`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Continue to catalog
          </Link>
        </div>
      </section>
    </div>
  )
}
