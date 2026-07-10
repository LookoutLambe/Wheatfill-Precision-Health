import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CatalogVialThumb from '../components/CatalogVialThumb'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import { CATALOG_HIGHLIGHT_PRODUCTS } from '../data/catalogHighlight'
import { bumpCartSku, countCartItems } from '../lib/pharmacyCart'
import CatalogProductDosingHint from '../components/CatalogProductDosingHint'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerWithProducts = { slug: string; name: string; products: Product[] }

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

function vialFamilyForSku(sku: string) {
  if (sku.startsWith('TZ')) return 'tirzepatide'
  if (sku.startsWith('SEMA')) return 'semaglutide'
  return 'neutral'
}

export default function PharmacyOptions() {
  const [cartTick, setCartTick] = useState(0)
  const [mvPartner, setMvPartner] = useState<PartnerWithProducts | null>(null)

  const mvSlug = 'mountain-view'

  useEffect(() => {
    // Catalog is front-end controlled (the API backend can't be redeployed), so use the local list.
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
  }, [])

  const cartCountMv = useMemo(() => countCartItems(mvSlug), [cartTick])

  const refreshCart = useCallback(() => setCartTick((t) => t + 1), [])

  const onAddLine = useCallback(
    (partnerSlug: string, sku: string) => {
      bumpCartSku(partnerSlug, sku, 1)
      refreshCart()
    },
    [refreshCart],
  )

  return (
    <div className={`page orderNowHubPage ${cartCountMv > 0 ? 'orderNowHubPage--cart' : ''}`}>
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
              </Link>
              .
            </p>
          </div>
          <Link to="/" className="btn catalogOutlineBtn orderNowHubHomeBtn" style={{ textDecoration: 'none' }}>
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

        <div className="orderNowShipNote" role="note" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '4px 0 14px', fontWeight: 800 }}>
          <span className="pill" style={{ background: '#b9932e', color: '#fff', borderColor: '#b9932e' }}>
            🚚 Free overnight shipping
          </span>
          <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>
            Auto-inject pen coming soon (+$10/order) — dial your actual dose, no unit conversions.
          </span>
        </div>

        <div className="orderNowDualCatalogCol orderNowDualCatalogCol--mv" role="region" aria-label="GLP-1 catalog">
          <div className="orderNowDualCatalogHead">
            <div className="orderNowDualCatalogTitle">{mvPartner?.name || resolvedFulfillmentPharmacyName()}</div>
            <Link to={`/order-now/${mvSlug}`} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
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
                      className="btn btnPrimary orderNowAddBtn"
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

        <div className="orderNowAfterProducts">
          <div className="btnRow orderNowAfterBtnRow">
            <Link to={`/order-now/${mvSlug}/summary`} className="btn btnPrimary orderNowWideBtn" style={{ textDecoration: 'none' }}>
              View Cart
            </Link>
          </div>
          <p className="muted orderNowFineprint">
            Use <b>View Cart & Summary</b> when you are ready to review lines, acknowledgments, and submit.
          </p>
        </div>
      </section>

      {cartCountMv > 0 ? (
        <div className="orderNowMiniCart" role="region" aria-label="Shopping cart summary">
          <div className="orderNowMiniCartInner">
            <div>
              <div className="orderNowMiniCartLabel">Your cart</div>
              <div className="orderNowMiniCartCount">
                <b>{resolvedFulfillmentPharmacyName()}</b>: {cartCountMv} {cartCountMv === 1 ? 'item' : 'items'}
              </div>
            </div>
            <div className="btnRow" style={{ margin: 0, gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Link
                to={`/order-now/${mvSlug}/summary`}
                className="btn btnPrimary orderNowMiniCartCta"
                style={{ textDecoration: 'none' }}
              >
                View {resolvedFulfillmentPharmacyName()}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
