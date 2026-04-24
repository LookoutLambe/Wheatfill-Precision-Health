import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CatalogVialThumb from '../components/CatalogVialThumb'
import VenmoPayToHint from '../components/VenmoPayToHint'
import { API_URL, apiGet } from '../api/client'
import { CONTRACTED_PHARMACY_NAME, PRACTICE_PUBLIC_NAME } from '../config/provider'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { bumpCartSku, countCartItems } from '../lib/pharmacyCart'

type Partner = { slug: string; name: string }

const FALLBACK_PARTNERS: Partner[] = [
  { slug: DEFAULT_CATALOG_PARTNER_SLUG, name: CONTRACTED_PHARMACY_NAME },
]

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export default function PharmacyOptions() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [apiUnavailable, setApiUnavailable] = useState(false)
  const [cartTick, setCartTick] = useState(0)

  const hubSlug = DEFAULT_CATALOG_PARTNER_SLUG

  useEffect(() => {
    let cancelled = false
    apiGet<{ partners: Partner[] }>('/v1/pharmacies')
      .then((r) => {
        if (cancelled) return
        const list = r.partners?.length ? r.partners : FALLBACK_PARTNERS
        setPartners(list)
        setApiUnavailable(false)
      })
      .catch(() => {
        if (cancelled) return
        setPartners(FALLBACK_PARTNERS)
        setApiUnavailable(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cartCount = useMemo(() => countCartItems(hubSlug), [hubSlug, cartTick])

  const refreshCart = useCallback(() => setCartTick((t) => t + 1), [])

  const onAddLine = useCallback(
    (sku: string) => {
      bumpCartSku(hubSlug, sku, 1)
      refreshCart()
    },
    [hubSlug, refreshCart],
  )

  return (
    <div className={`page orderNowHubPage ${cartCount > 0 ? 'orderNowHubPage--cart' : ''}`}>
      <header className="orderNowHubHero">
        <div className="orderNowHubHeroTop">
          <div>
            <h1 className="orderNowHubTitle">Order Now Catalog</h1>
            <p className="muted orderNowHubLead">
              You are ordering through {PRACTICE_PUBLIC_NAME}: browse products and prices here, build your
              bag, then open <b>View Cart</b> for a full summary. We coordinate fulfillment with{' '}
              {CONTRACTED_PHARMACY_NAME} when medication is prescribed, and your care team can step in if
              your order needs attention. For now, payment is via <b>Venmo</b> after you submit your order from
              the summary page—the practice sends amount and pay-to details.
            </p>
            <VenmoPayToHint style={{ marginTop: 12 }} />
          </div>
          <Link to="/" className="btn orderNowHubHomeBtn" style={{ textDecoration: 'none' }}>
            Home
          </Link>
        </div>
      </header>

      {apiUnavailable ? (
        <div className="orderNowOffline" role="status">
          <span>
            Showing catalog and cart offline—the server at <code className="orderNowCode">{API_URL}</code>{' '}
            could not be reached. Set your API URL (see tip below) to load live partners and order workflows.
          </span>
          <span className="orderNowOfflineTip">
            Tip: add <code className="orderNowCode">?api=https://YOUR_BACKEND</code> once, or set{' '}
            <code className="orderNowCode">VITE_API_URL</code> for builds.
          </span>
        </div>
      ) : null}

      <section className="orderNowProductsSection catalogShopRoot" aria-labelledby="order-now-products-heading">
        <div className="orderNowSectionHead">
          <h2 id="order-now-products-heading">Browse Products</h2>
          <span className="pill pillRed">GLP-1</span>
        </div>
        <p className="muted orderNowSectionSub">
          List prices for our standard vial SKUs. Your selections are saved in this browser until you
          check out or clear the cart on the catalog page. Checkout is with the practice, not directly with
          the pharmacy website.
        </p>

        <ul className="orderNowProductList">
          {CATALOG_HIGHLIGHT_PRODUCTS.map((p) => (
            <li key={p.sku} className="orderNowProductCard">
              <CatalogVialThumb family={p.family} />
              <div className="orderNowProductBody">
                <div className="orderNowProductName">{p.name}</div>
                <div className="muted orderNowProductSub">{p.subtitle}</div>
              </div>
              <div className="orderNowProductMeta">
                <span className="orderNowProductPrice">{formatPrice(p.priceCents)}</span>
                <button type="button" className="btn catalogOutlineBtn orderNowAddBtn" onClick={() => onAddLine(p.sku)}>
                  Add To Cart
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="orderNowAfterProducts">
          <div className="btnRow orderNowAfterBtnRow">
            <Link
              to={`/order-now/${hubSlug}`}
              className="btn catalogOutlineBtn orderNowWideBtn"
              style={{ textDecoration: 'none' }}
            >
              Open Full Product List
            </Link>
            <Link
              to={`/order-now/${hubSlug}/summary`}
              className="btn btnPrimary orderNowWideBtn"
              style={{ textDecoration: 'none' }}
            >
              View Cart & Summary
            </Link>
          </div>
          <p className="muted orderNowFineprint">
            Use <b>View Cart & Summary</b> when you are ready to review lines, acknowledgments, and submit for Venmo
            payment instructions.
          </p>
        </div>
      </section>

      {partners.length > 0 ? (
        <section className="orderNowPartnersSection card cardAccentSoft" aria-labelledby="order-now-partners-heading">
          <div className="orderNowSectionHead">
            <h2 id="order-now-partners-heading">More Catalogs</h2>
            <span className="pill">Catalogs</span>
          </div>
          <p className="muted orderNowSectionSub">
            If your care team uses another supplier menu, open it here. The default list above matches our
            standard menu fulfilled through {CONTRACTED_PHARMACY_NAME} when prescribed, coordinated by{' '}
            {PRACTICE_PUBLIC_NAME}.
          </p>
          <div className="divider" />
          <div className="orderNowPartnerChips">
            {partners.map((p) => (
              <Link
                key={p.slug}
                to={`/order-now/${p.slug}`}
                className="orderNowPartnerChip"
                style={{ textDecoration: 'none' }}
              >
                <span className="orderNowPartnerChipName">{p.name}</span>
                <span className="orderNowPartnerChipAction">Open →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {cartCount > 0 ? (
        <div className="orderNowMiniCart" role="region" aria-label="Shopping cart summary">
          <div className="orderNowMiniCartInner">
            <div>
              <div className="orderNowMiniCartLabel">Your cart</div>
              <div className="orderNowMiniCartCount">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart — continue to summary for Venmo payment steps
              </div>
            </div>
            <Link
              to={`/order-now/${hubSlug}/summary`}
              className="btn btnPrimary orderNowMiniCartCta"
              style={{ textDecoration: 'none' }}
            >
              View Cart
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
