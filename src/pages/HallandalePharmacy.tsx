import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { bumpCartSku, countCartItems } from '../lib/pharmacyCart'
import CatalogProductDosingHint from '../components/CatalogProductDosingHint'
import { apiGet } from '../api/client'

const SLUG = 'hallandale'
const PARTNER = 'Hallandale Pharmacy'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function moneyWhole(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function groupLabel(p: Product) {
  if (/Semaglutide/i.test(p.name)) return 'Semaglutide Flex-Dose'
  if (/FORTE/i.test(p.subtitle) || /15\s*mg\/mL/i.test(p.name)) return 'Tirzepatide FORTE Flex-Dose'
  if (/Tirzepatide/i.test(p.name)) return 'Tirzepatide Flex-Dose'
  return 'Products'
}

export default function HallandalePharmacy() {
  const [cartCount, setCartCount] = useState(() => countCartItems(SLUG))
  const [announce, setAnnounce] = useState('')
  const baseId = useId()
  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(SLUG)}`)
      .then((r) => {
        setPartner(r.partner)
        setError(null)
      })
      .catch((e) => {
        setPartner(null)
        setError(String((e as any)?.message || e || 'Failed to load catalog.'))
      })
  }, [])

  const products = partner?.products || []
  const groups = useMemo(() => {
    const m = new Map<string, Product[]>()
    for (const p of products) {
      const key = groupLabel(p)
      const cur = m.get(key)
      if (cur) cur.push(p)
      else m.set(key, [p])
    }
    return [...m.entries()]
  }, [products])

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
      <a href="#hallandale-main" className="mountainViewSkip">
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
        <h1 className="mountainViewH1" id="hallandale-heading">
          {PARTNER}
        </h1>
        <p className="muted mountainViewLead">
          Representative GLP-1 pricing for {PARTNER}. You place orders with {PRACTICE_PUBLIC_NAME} on this site—not directly
          with the pharmacy website.
        </p>
        <div className="btnRow mountainViewCtas" style={{ flexWrap: 'wrap' }}>
          <Link to={`/order-now/${SLUG}`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
            Open full catalog
          </Link>
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 10, marginBottom: 0, maxWidth: 720 }}>
          Shipping is a flat <strong>$30</strong> on checkout.
        </p>
        {cartCount > 0 ? (
          <p className="muted" style={{ fontSize: 14, marginTop: 8, marginBottom: 0, maxWidth: 720 }} aria-live="polite">
            {cartCount} {cartCount === 1 ? 'item' : 'items'} in your bag—click the header bag to check out.
          </p>
        ) : null}
      </header>

      {announce ? (
        <div className="mountainViewLive" role="status" aria-live="polite" aria-atomic="true" id={`${baseId}-live`}>
          {announce}
        </div>
      ) : null}

      {error ? (
        <section className="card cardAccentRed" style={{ maxWidth: 980 }}>
          <div style={{ fontWeight: 900 }}>Catalog error</div>
          <div className="divider" />
          <div className="muted">{error}</div>
        </section>
      ) : null}

      <main id="hallandale-main" tabIndex={-1} aria-labelledby="hallandale-heading" className="mountainViewMain">
        {!partner && !error ? <p className="muted">Loading Catalog…</p> : null}
        {partner
          ? groups.map(([label, rows]) => {
              const sectionId = `${baseId}-sec-${label.replace(/\s+/g, '-').toLowerCase()}`
              return (
                <section key={label} className="mountainViewSection card cardAccentSoft" aria-labelledby={sectionId}>
                  <h2 className="mountainViewH2" id={sectionId}>
                    {label}
                  </h2>
                  <div className="mountainViewTableWrap" role="region" aria-label={`${label} price list`} tabIndex={0}>
                    <table className="mountainViewTable">
                      <caption className="mountainViewCaption">
                        {label} — list prices. For education only; clinical decisions are separate from posted menus.
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
                        {rows.map((p) => (
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
                              <button type="button" className="btn btnPrimary mountainViewAddBtn" onClick={() => onAdd(p.sku, p.name)}>
                                Add to cart
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })
          : null}
      </main>

      <section className="card cardAccentNavy mountainViewNext" aria-labelledby="hallandale-next-heading">
        <h2 className="mountainViewH2" id="hallandale-next-heading" style={{ margin: 0 }}>
          Next steps
        </h2>
        <p className="muted" style={{ marginTop: 10, marginBottom: 0, maxWidth: 720 }}>
          Review acknowledgments, contact details, shipping, and checkout on the order summary.
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

