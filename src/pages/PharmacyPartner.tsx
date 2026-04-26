import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CatalogVialThumb, { type CatalogVialFamily } from '../components/CatalogVialThumb'
import CatalogCartDrawer from '../components/CatalogCartDrawer'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { catalogPartnerTitle } from '../lib/orderNowDisplay'
import { bumpCartSku, writeCartForSlug } from '../lib/pharmacyCart'
import { apiGet } from '../api/client'
import CatalogProductDosingHint from '../components/CatalogProductDosingHint'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function moneyWhole(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function vialFamilyForSku(sku: string): CatalogVialFamily {
  if (sku.startsWith('TZ')) return 'tirzepatide'
  if (sku.startsWith('SEMA')) return 'semaglutide'
  return 'neutral'
}

export default function PharmacyPartner() {
  const { slug = '' } = useParams()
  const isPrimaryCatalog = slug === DEFAULT_CATALOG_PARTNER_SLUG
  const [searchParams, setSearchParams] = useSearchParams()
  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [offlineCatalog, setOfflineCatalog] = useState(false)

  useEffect(() => {
    if (!slug) return
    setPartner(null)
    setError(null)
    setOfflineCatalog(false)
    apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(slug)}`)
      .then((r) => {
        setPartner(r.partner)
        setError(null)
        setOfflineCatalog(false)
      })
      .catch((e) => {
        if (slug === DEFAULT_CATALOG_PARTNER_SLUG) {
          setPartner({
            slug,
            name: resolvedFulfillmentPharmacyName(),
            products: CATALOG_HIGHLIGHT_PRODUCTS.map((p) => ({
              sku: p.sku,
              name: p.name,
              subtitle: p.subtitle,
              priceCents: p.priceCents,
              currency: 'usd',
            })),
          })
          setError(null)
          setOfflineCatalog(true)
        } else {
          setPartner(null)
          setError(String(e?.message || e))
          setOfflineCatalog(false)
        }
      })
  }, [slug])

  useEffect(() => {
    if (searchParams.get('paid') === '1') {
      writeCartForSlug(slug, {})
      setCartOpen(false)
      const next = new URLSearchParams(searchParams)
      next.delete('paid')
      next.delete('order')
      next.delete('canceled')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, slug])

  const lineProducts = partner?.products || []

  return (
    <div className="page pharmacyPartnerPage">
      <div className="catalogShopRoot">
        <nav className="wphBreadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="wphBreadcrumbsSep" aria-hidden="true">
            /
          </span>
          <Link to="/order-now">Order Now</Link>
          <span className="wphBreadcrumbsSep" aria-hidden="true">
            /
          </span>
          <span className="wphBreadcrumbsCurrent">{partner ? catalogPartnerTitle(partner.name) : 'Catalog'}</span>
        </nav>
        <div className="pharmacyToolbar">
          <div className="pharmacyToolbarMain">
            <h1 className="pharmacyToolbarTitle">
              {partner && isPrimaryCatalog
                ? `Order through ${PRACTICE_PUBLIC_NAME}`
                : partner
                  ? catalogPartnerTitle(partner.name)
                  : 'Medication catalog'}
            </h1>
            <p className="muted pharmacyToolbarSub">
              {isPrimaryCatalog ? (
                <>
                  Add vials to your cart, then open <b>View cart</b> for a full summary. You are ordering through
                  our practice—we coordinate preferred pricing and fulfillment with {resolvedFulfillmentPharmacyName()} when
                  medication is prescribed, and your care team can resolve order issues on our side. Payment happens on a
                  secure checkout link after you submit from the summary page—the practice follows up with details.
                </>
              ) : (
                <>
                  This is the product list—add vials to your bag, then open <b>View cart</b> for a full summary.
                  Payment happens on a secure checkout link after you submit from the summary page; the team sends pay-to details.
                </>
              )}
            </p>
            <VenmoPayToHint style={{ marginTop: 10 }} />
          </div>
          <div className="pharmacyToolbarActions">
            {slug ? (
              <CatalogCartDrawer
                slug={slug}
                products={lineProducts}
                open={cartOpen}
                onOpenChange={setCartOpen}
              />
            ) : null}
            <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
              All Catalogs
            </Link>
            <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
              Home
            </Link>
          </div>
        </div>

        {error ? (
          <div className="card cardAccentRed">
            <div style={{ fontWeight: 800 }}>Error</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">{error}</div>
          </div>
        ) : null}

        {offlineCatalog ? (
          <div className="orderNowOffline" role="status">
            Offline catalog: list prices below match our standard menu. Connect your API to sync with the database and
            enable integrated checkout when available.
          </div>
        ) : null}

        <section className="pharmacyCatalog">
          {!partner && !error ? (
            <p className="muted">Loading Catalog…</p>
          ) : partner ? (
            <ul className="pharmacyProductList">
              {partner.products.map((p) => (
                <li key={p.sku} className="pharmacyProductRow card cardAccentSoft">
                  <div className="pharmacyProductRowTop">
                    <CatalogVialThumb family={vialFamilyForSku(p.sku)} />
                    <div className="pharmacyProductBody">
                      <div className="pharmacyProductTitle">{p.name}</div>
                      <div className="muted pharmacyProductSubtitle">{p.subtitle}</div>
                      <div className="pharmacyProductPriceRow">
                        <span className="pharmacyProductPrice">{moneyWhole(p.priceCents)}</span>
                        <button
                          type="button"
                          className="btn catalogOutlineBtn pharmacyAddBtn"
                          onClick={() => {
                            bumpCartSku(slug, p.sku, 1)
                            setCartOpen(true)
                          }}
                        >
                          Add To Cart
                        </button>
                      </div>
                    </div>
                  </div>
                  <CatalogProductDosingHint name={p.name} priceCents={p.priceCents} layout="band" />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </div>
  )
}
