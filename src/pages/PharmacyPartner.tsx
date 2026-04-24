import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CatalogVialThumb, { type CatalogVialFamily } from '../components/CatalogVialThumb'
import ZellePayToHint from '../components/ZellePayToHint'
import { CONTRACTED_PHARMACY_NAME, PRACTICE_PUBLIC_NAME } from '../config/provider'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { catalogPartnerTitle } from '../lib/orderNowDisplay'
import { readCartForSlug, writeCartForSlug } from '../lib/pharmacyCart'
import { apiGet } from '../api/client'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function moneyWhole(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function moneyCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
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
  const [cart, setCart] = useState<Record<string, number>>({})
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
            name: CONTRACTED_PHARMACY_NAME,
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
    setCart(readCartForSlug(slug))
  }, [slug])

  useEffect(() => {
    if (!slug) return
    writeCartForSlug(slug, cart)
  }, [cart, slug])

  useEffect(() => {
    if (searchParams.get('paid') === '1') {
      setCart({})
      writeCartForSlug(slug, {})
      setCartOpen(false)
      const next = new URLSearchParams(searchParams)
      next.delete('paid')
      next.delete('order')
      next.delete('canceled')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, slug])

  useEffect(() => {
    if (cartOpen) document.documentElement.classList.add('pharmacyCartOpen')
    else document.documentElement.classList.remove('pharmacyCartOpen')
    return () => document.documentElement.classList.remove('pharmacyCartOpen')
  }, [cartOpen])

  const items = useMemo(() => {
    if (!partner) return []
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([sku, quantity]) => {
        const p = partner.products.find((x) => x.sku === sku)
        return p ? { sku, quantity, product: p } : null
      })
      .filter(Boolean) as Array<{ sku: string; quantity: number; product: Product }>
  }, [cart, partner])

  const itemCount = useMemo(() => items.reduce((n, it) => n + it.quantity, 0), [items])

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.product.priceCents * it.quantity, 0),
    [items],
  )

  const closeCart = () => setCartOpen(false)

  return (
    <div className="page pharmacyPartnerPage">
      <div className="catalogShopRoot">
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
                Add vials to your cart, then open <b>View Cart</b> for a full summary. You are ordering through
                our practice—we coordinate preferred pricing and fulfillment with {CONTRACTED_PHARMACY_NAME} when
                medication is prescribed, and your care team can resolve order issues on our side. For now, payment
                is via <b>Zelle</b> after you submit from the summary page—the practice follows up with amount and
                pay-to details.
              </>
            ) : (
              <>
                This is the product list—add vials to your bag, then open <b>View Cart</b> for a full summary.
                Payment is via <b>Zelle</b> after you submit from the summary page; the practice sends Zelle
                instructions.
              </>
            )}
          </p>
          <ZellePayToHint style={{ marginTop: 10 }} />
        </div>
        <div className="pharmacyToolbarActions">
          <button
            type="button"
            className="pharmacyCartBtn"
            aria-label={`Shopping cart, ${itemCount} items`}
            onClick={() => setCartOpen(true)}
          >
            <span className="pharmacyCartIcon" aria-hidden="true" />
            {itemCount > 0 ? <span className="pharmacyCartBadge">{itemCount > 99 ? '99+' : itemCount}</span> : null}
          </button>
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
                        setCart((c) => ({ ...c, [p.sku]: (c[p.sku] || 0) + 1 }))
                        setCartOpen(true)
                      }}
                    >
                      Add To Cart
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      </div>

      {cartOpen ? (
        <>
          <button type="button" className="pharmacyDrawerScrim" aria-label="Close cart" onClick={closeCart} />
          <aside className="pharmacyDrawer" aria-label="Shopping cart">
            <div className="pharmacyDrawerTop">
              <h2 className="pharmacyDrawerTitle">Cart ({itemCount} {itemCount === 1 ? 'Item' : 'Items'})</h2>
              <button type="button" className="pharmacyDrawerClose" onClick={closeCart} aria-label="Close cart">
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className="muted" style={{ marginTop: 8 }}>
                Your cart is empty. Add products from the list.
              </p>
            ) : (
              <>
                <ul className="pharmacyDrawerLines">
                  {items.map((it) => (
                    <li key={it.sku} className="pharmacyDrawerLine">
                      <CatalogVialThumb family={vialFamilyForSku(it.sku)} />
                      <div className="pharmacyDrawerLineBody">
                        <div className="pharmacyDrawerLineName">{it.product.name}</div>
                        <div className="pharmacyDrawerLineMeta">
                          <span className="muted">{moneyCents(it.product.priceCents)} each</span>
                        </div>
                        <div className="pharmacyDrawerQtyRow">
                          <button
                            type="button"
                            className="btn"
                            aria-label="Decrease quantity"
                            onClick={() =>
                              setCart((c) => {
                                const q = (c[it.sku] || 0) - 1
                                const next = { ...c }
                                if (q <= 0) delete next[it.sku]
                                else next[it.sku] = q
                                return next
                              })
                            }
                          >
                            −
                          </button>
                          <span className="pill">{it.quantity}</span>
                          <button
                            type="button"
                            className="btn"
                            aria-label="Increase quantity"
                            onClick={() => setCart((c) => ({ ...c, [it.sku]: (c[it.sku] || 0) + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="pharmacyDrawerLineTotal">{moneyCents(it.product.priceCents * it.quantity)}</div>
                    </li>
                  ))}
                </ul>

                <div className="pharmacyDrawerDivider" />

                <div className="pharmacyDrawerTotalRow">
                  <span style={{ fontWeight: 800 }}>Estimated Subtotal</span>
                  <span className="pharmacyDrawerTotalAmt">{moneyCents(subtotal)}</span>
                </div>

                <p className="muted" style={{ fontSize: 12, lineHeight: 1.45, margin: '12px 0 0' }}>
                  Review shipping acknowledgments and pay on the next page—only when you are ready.
                </p>

                <div className="pharmacyDrawerActions">
                  <button type="button" className="btn" style={{ width: '100%' }} onClick={closeCart}>
                    Continue Shopping
                  </button>
                  <Link
                    to={`/order-now/${encodeURIComponent(slug)}/summary`}
                    className="btn btnPrimary"
                    style={{ width: '100%', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                    onClick={closeCart}
                  >
                    View Cart
                  </Link>
                </div>
                <p className="muted" style={{ margin: '10px 0 0', fontSize: 12, textAlign: 'center' }}>
                  Secure payment after summary
                </p>
              </>
            )}
          </aside>
        </>
      ) : null}
    </div>
  )
}
