import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CatalogVialThumb from '../components/CatalogVialThumb'
import { apiGet } from '../api/client'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import { CATALOG_HIGHLIGHT_PRODUCTS } from '../data/catalogHighlight'
import { bumpCartSku, countCartItems } from '../lib/pharmacyCart'
import CatalogProductDosingHint from '../components/CatalogProductDosingHint'
import { HALLANDALE_FALLBACK_PRODUCTS } from '../data/catalogHallandale'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerWithProducts = { slug: string; name: string; products: Product[] }
type PartnerResp = { partner: PartnerWithProducts }

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function vialFamilyForSku(sku: string) {
  if (sku.startsWith('TZ')) return 'tirzepatide'
  if (sku.startsWith('SEMA')) return 'semaglutide'
  if (sku.startsWith('H_TZ')) return 'tirzepatide'
  if (sku.startsWith('H_SEMA')) return 'semaglutide'
  return 'neutral'
}

export default function PharmacyOptions() {
  const [cartTick, setCartTick] = useState(0)
  const [mvPartner, setMvPartner] = useState<PartnerWithProducts | null>(null)
  const [hallPartner, setHallPartner] = useState<PartnerWithProducts | null>(null)

  // Keep default slug imported for compatibility with older links; hub now shows both catalogs.
  const mvSlug = 'mountain-view'
  const hallSlug = 'hallandale'

  useEffect(() => {
    let cancelled = false
    // Fetch the two main catalogs so the hub can show them side-by-side.
    Promise.allSettled([
      apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(mvSlug)}`),
      apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(hallSlug)}`),
    ])
      .then((rows) => {
        if (cancelled) return
        const mv = rows[0].status === 'fulfilled' ? rows[0].value.partner : null
        const hall = rows[1].status === 'fulfilled' ? rows[1].value.partner : null
        setMvPartner(
          mv || {
            slug: mvSlug,
            name: resolvedFulfillmentPharmacyName(),
            products: CATALOG_HIGHLIGHT_PRODUCTS.map((p) => ({
              sku: p.sku,
              name: p.name,
              subtitle: p.subtitle,
              priceCents: p.priceCents,
              currency: 'usd',
            })),
          },
        )
        setHallPartner(
          hall || {
            slug: hallSlug,
            name: 'Hallandale Pharmacy',
            products: HALLANDALE_FALLBACK_PRODUCTS,
          },
        )
      })
      .catch(() => {
        if (cancelled) return
        setMvPartner({
          slug: mvSlug,
          name: resolvedFulfillmentPharmacyName(),
          products: CATALOG_HIGHLIGHT_PRODUCTS.map((p) => ({
            sku: p.sku,
            name: p.name,
            subtitle: p.subtitle,
            priceCents: p.priceCents,
            currency: 'usd',
          })),
        })
        setHallPartner({
          slug: hallSlug,
          name: 'Hallandale Pharmacy',
          products: HALLANDALE_FALLBACK_PRODUCTS,
        })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cartCountMv = useMemo(() => countCartItems(mvSlug), [cartTick])
  const cartCountHall = useMemo(() => countCartItems(hallSlug), [cartTick])
  const cartCountTotal = cartCountMv + cartCountHall

  const refreshCart = useCallback(() => setCartTick((t) => t + 1), [])

  const onAddLine = useCallback(
    (partnerSlug: string, sku: string) => {
      bumpCartSku(partnerSlug, sku, 1)
      refreshCart()
    },
    [refreshCart],
  )

  return (
    <div className={`page orderNowHubPage ${cartCountTotal > 0 ? 'orderNowHubPage--cart' : ''}`}>
      <nav className="wphBreadcrumbs" aria-label="Breadcrumb" style={{ maxWidth: 1120, margin: '0 auto 10px', padding: '0 16px' }}>
        <Link to="/">Home</Link>
        <span className="wphBreadcrumbsSep" aria-hidden="true">
          /
        </span>
        <span className="wphBreadcrumbsCurrent">Order Now</span>
      </nav>
      <header className="orderNowHubHero">
        <div className="orderNowHubHeroTop">
          <div>
            <h1 className="orderNowHubTitle">Order Now Catalog</h1>
            <p className="muted orderNowHubLead">
              You are ordering through {PRACTICE_PUBLIC_NAME}: browse products and prices here, build your
              bag, then open <b>View Cart</b> for a full summary. We coordinate fulfillment with{' '}
              {resolvedFulfillmentPharmacyName()} when medication is prescribed, and your care team can step in if
              your order needs attention.
            </p>
            <p className="muted" style={{ marginTop: 14, fontSize: 14, marginBottom: 0 }}>
              Browse an accessible, table-style price list:{' '}
              <Link to="/pharmacy/mountain-view" style={{ fontWeight: 800 }}>
                {resolvedFulfillmentPharmacyName()}
              </Link>{' '}
              {' '}and{' '}
              <Link to="/pharmacy/hallandale" style={{ fontWeight: 800 }}>
                Hallandale Pharmacy
              </Link>{' '}
              (same cart; add to cart on either page).
            </p>
          </div>
          <Link to="/" className="btn orderNowHubHomeBtn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
        </div>
      </header>

      <section className="orderNowProductsSection catalogShopRoot" aria-labelledby="order-now-products-heading">
        <div className="orderNowSectionHead">
          <h2 id="order-now-products-heading">Browse Products</h2>
          <span className="pill pillRed">GLP-1</span>
        </div>
        <p className="muted orderNowSectionSub">
          List prices for our standard vial SKUs. Your selections are saved in this browser until you
          check out or clear the cart on the catalog page. Checkout is with the practice, not directly with
          the pharmacy website. Each card shows <strong>total mg in the vial</strong>, <strong>approximate list $/mg</strong>{' '}
          for comparison, and a link to the <Link to="/medications#dosing-guide">titration dosing guide</Link>.
        </p>

        <div className="orderNowDualCatalogGrid" role="region" aria-label="Mountain View and Hallandale catalogs">
          <div className="orderNowDualCatalogCol orderNowDualCatalogCol--mv">
            <div className="orderNowDualCatalogHead">
              <div className="orderNowDualCatalogTitle">{mvPartner?.name || resolvedFulfillmentPharmacyName()}</div>
              <Link to={`/order-now/${mvSlug}`} className="btn" style={{ textDecoration: 'none' }}>
                Full list
              </Link>
            </div>
            <ul className="orderNowProductList">
              {(mvPartner?.products || CATALOG_HIGHLIGHT_PRODUCTS).map((p: any) => (
                <li key={p.sku} className="orderNowProductCard">
                  <div className="orderNowProductTop">
                    <CatalogVialThumb family={p.family || vialFamilyForSku(p.sku)} />
                    <div className="orderNowProductBody">
                      <div className="orderNowProductName">{p.name}</div>
                      <div className="muted orderNowProductSub">{p.subtitle}</div>
                    </div>
                    <div className="orderNowProductMeta">
                      <span className="orderNowProductPrice">{formatPrice(p.priceCents)}</span>
                      <button
                        type="button"
                        className="btn catalogOutlineBtn orderNowAddBtn"
                        onClick={() => onAddLine(mvSlug, p.sku)}
                      >
                        Add To Cart
                      </button>
                    </div>
                  </div>
                  <CatalogProductDosingHint name={p.name} priceCents={p.priceCents} layout="band" />
                </li>
              ))}
            </ul>
          </div>

          <div className="orderNowDualCatalogCol orderNowDualCatalogCol--hall">
            <div className="orderNowDualCatalogHead">
              <div className="orderNowDualCatalogTitle">Hallandale Pharmacy</div>
              <Link to={`/order-now/${hallSlug}`} className="btn" style={{ textDecoration: 'none' }}>
                Full list
              </Link>
            </div>
            <ul className="orderNowProductList">
              {(hallPartner?.products || HALLANDALE_FALLBACK_PRODUCTS).map((p) => (
                <li key={p.sku} className="orderNowProductCard">
                  <div className="orderNowProductTop">
                    <CatalogVialThumb family={vialFamilyForSku(p.sku)} />
                    <div className="orderNowProductBody">
                      <div className="orderNowProductName">{p.name}</div>
                      <div className="muted orderNowProductSub">{p.subtitle}</div>
                    </div>
                    <div className="orderNowProductMeta">
                      <span className="orderNowProductPrice">{formatPrice(p.priceCents)}</span>
                      <button type="button" className="btn catalogOutlineBtn orderNowAddBtn" onClick={() => onAddLine(hallSlug, p.sku)}>
                        Add To Cart
                      </button>
                    </div>
                  </div>
                  <CatalogProductDosingHint name={p.name} priceCents={p.priceCents} layout="band" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="orderNowAfterProducts">
          <div className="btnRow orderNowAfterBtnRow">
            <Link to={`/order-now/${mvSlug}/summary`} className="btn btnPrimary orderNowWideBtn" style={{ textDecoration: 'none' }}>
              View Mountain View Cart
            </Link>
            <Link
              to={`/order-now/${hallSlug}/summary`}
              className="btn catalogOutlineBtn orderNowWideBtn"
              style={{ textDecoration: 'none' }}
            >
              View Hallandale Cart
            </Link>
          </div>
          <p className="muted orderNowFineprint">
            Use <b>View Cart & Summary</b> when you are ready to review lines, acknowledgments, and submit.
          </p>
        </div>
      </section>

      {/* Only show Mountain View + Hallandale catalogs on this hub. */}

      {cartCountTotal > 0 ? (
        <div className="orderNowMiniCart" role="region" aria-label="Shopping cart summary">
          <div className="orderNowMiniCartInner">
            <div>
              <div className="orderNowMiniCartLabel">Your cart</div>
              <div className="orderNowMiniCartCount">
                {cartCountMv > 0 ? (
                  <>
                    <b>{resolvedFulfillmentPharmacyName()}</b>: {cartCountMv} {cartCountMv === 1 ? 'item' : 'items'}
                  </>
                ) : null}
                {cartCountMv > 0 && cartCountHall > 0 ? <span className="muted"> {' · '} </span> : null}
                {cartCountHall > 0 ? (
                  <>
                    <b>Hallandale</b>: {cartCountHall} {cartCountHall === 1 ? 'item' : 'items'}
                  </>
                ) : null}
              </div>
            </div>
            <div className="btnRow" style={{ margin: 0, gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {cartCountMv > 0 ? (
                <Link
                  to={`/order-now/${mvSlug}/summary`}
                  className="btn btnPrimary orderNowMiniCartCta"
                  style={{ textDecoration: 'none' }}
                >
                  View {resolvedFulfillmentPharmacyName()}
                </Link>
              ) : null}
              {cartCountHall > 0 ? (
                <Link to={`/order-now/${hallSlug}/summary`} className="btn orderNowMiniCartCta" style={{ textDecoration: 'none' }}>
                  View Hallandale
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
