import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CatalogVialThumb, { type CatalogVialFamily } from '../components/CatalogVialThumb'
import ZellePayToHint from '../components/ZellePayToHint'
import { CONTRACTED_PHARMACY_NAME, PRACTICE_PUBLIC_NAME } from '../config/provider'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { catalogPartnerTitle } from '../lib/orderNowDisplay'
import { bumpCartSku, readCartForSlug, writeCartForSlug } from '../lib/pharmacyCart'
import { apiGet, apiPost, getToken } from '../api/client'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function moneyCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function vialFamilyForSku(sku: string): CatalogVialFamily {
  if (sku.startsWith('TZ')) return 'tirzepatide'
  if (sku.startsWith('SEMA')) return 'semaglutide'
  return 'neutral'
}

export default function OrderNowSummary() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const isPrimaryCatalog = slug === DEFAULT_CATALOG_PARTNER_SLUG
  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [offlineCatalog, setOfflineCatalog] = useState(false)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [agree, setAgree] = useState(false)
  const [contactOk, setContactOk] = useState(false)
  const [sigName, setSigName] = useState('')
  const [sigDate, setSigDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [insurance, setInsurance] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  useEffect(() => {
    if (!slug) return
    setPartner(null)
    setLoadError(null)
    setOfflineCatalog(false)
    apiGet<PartnerResp>(`/v1/pharmacies/${encodeURIComponent(slug)}`)
      .then((r) => {
        setPartner(r.partner)
        setLoadError(null)
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
          setLoadError(null)
          setOfflineCatalog(true)
        } else {
          setPartner(null)
          setLoadError(String(e?.message || e))
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

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.product.priceCents * it.quantity, 0),
    [items],
  )
  const insuranceCents = useMemo(() => (insurance ? Math.round(subtotal * 0.02) : 0), [insurance, subtotal])
  const total = subtotal + insuranceCents

  const setQty = (sku: string, nextQ: number) => {
    const cur = readCartForSlug(slug)
    const row = { ...cur }
    if (nextQ <= 0) delete row[sku]
    else row[sku] = nextQ
    writeCartForSlug(slug, row)
    setCart(row)
  }

  const onPay = () => {
    setCheckoutError(null)
    if (!partner || items.length === 0) return
    if (!getToken()) {
      const next = `/order-now/${encodeURIComponent(slug)}/summary`
      navigate(`/patient/login?next=${encodeURIComponent(next)}`)
      return
    }
    setCheckoutBusy(true)
    ;(async () => {
      try {
        const body = {
          partnerSlug: partner.slug,
          items: items.map((it) => ({ sku: it.sku, quantity: it.quantity })),
          agreedToShippingTerms: agree,
          contactPermission: contactOk,
          signatureName: sigName.trim(),
          signatureDate: sigDate,
          shippingInsurance: insurance,
        }
        const res = await apiPost<{ checkoutUrl: string | null; orderId?: string; totalCents?: number }>(
          '/v1/patient/orders/pharmacy',
          body,
        )
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl
          return
        }
        setCheckoutError(
          'We could not complete the online handoff for this order. Your request may still be on file—check with the office for Zelle payment instructions or next steps.',
        )
      } catch (e: any) {
        setCheckoutError(String(e?.message || e))
      } finally {
        setCheckoutBusy(false)
      }
    })()
  }

  const catalogPath = `/order-now/${encodeURIComponent(slug)}`

  return (
    <div className="page orderNowSummaryPage">
      <div className="catalogShopRoot">
        <div className="orderNowSummaryHeader">
          <div>
            <h1 className="orderNowSummaryTitle">My Cart</h1>
            <p className="muted orderNowSummaryLead">
              Review your selections. You are checking out through {PRACTICE_PUBLIC_NAME}.
              {isPrimaryCatalog ? (
                <>
                  {' '}
                  Fulfillment is coordinated with {CONTRACTED_PHARMACY_NAME} when prescribed. If your order needs
                  changes, message your care team—we handle coordination with the pharmacy.
                </>
              ) : null}{' '}
              For now, payment is via <b>Zelle</b> after the practice reviews your order. Submit below and your care
              team will follow up with the amount due and where to send payment.
            </p>
            <ZellePayToHint style={{ marginTop: 12 }} />
          </div>
          <Link to={catalogPath} className="orderNowContinueBrowse">
            Continue browsing →
          </Link>
        </div>

        {loadError ? (
          <div className="card cardAccentRed" style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800 }}>Unable To Load Catalog</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="muted">{loadError}</div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <Link to="/order-now" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
              Back To Order Now
            </Link>
          </div>
        ) : null}

        {offlineCatalog ? (
          <div className="orderNowOffline" role="status" style={{ marginTop: 14 }}>
            Showing standard list prices for this catalog. Connect the API for live inventory and automated checkout
            when available.
          </div>
        ) : null}

        {!partner && !loadError ? <p className="muted">Loading…</p> : null}

        {partner && items.length === 0 ? (
          <div className="orderNowSummaryEmpty card">
            <p className="muted" style={{ margin: 0 }}>
              Your cart is empty. Add products from the catalog, then return here to review and submit for Zelle
              payment instructions when you are ready.
            </p>
            <div className="btnRow" style={{ marginTop: 16 }}>
              <Link to={catalogPath} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                Browse Catalog
              </Link>
              <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
                All Catalogs
              </Link>
            </div>
          </div>
        ) : null}

        {partner && items.length > 0 ? (
          <>
            <p className="muted orderNowSummaryPartnerLine">
              {isPrimaryCatalog ? (
                <>
                  Order: <strong>{PRACTICE_PUBLIC_NAME}</strong> · fulfillment partner:{' '}
                  <strong>{CONTRACTED_PHARMACY_NAME}</strong>
                </>
              ) : (
                <>
                  Catalog: <strong>{catalogPartnerTitle(partner.name)}</strong>
                </>
              )}
            </p>
            <ul className="orderNowSummaryLines">
              {items.map((it) => (
                <li key={it.sku} className="orderNowSummaryLine card">
                  <button
                    type="button"
                    className="orderNowSummaryRemove"
                    aria-label={`Remove ${it.product.name}`}
                    onClick={() => setQty(it.sku, 0)}
                  >
                    ×
                  </button>
                  <CatalogVialThumb family={vialFamilyForSku(it.sku)} />
                  <div className="orderNowSummaryLineBody">
                    <div className="orderNowSummaryLineName">{it.product.name}</div>
                    <div className="muted orderNowSummaryLineEach">{moneyCents(it.product.priceCents)} each</div>
                    <div className="orderNowSummaryQtyRow">
                      <button
                        type="button"
                        className="btn catalogOutlineBtn"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(it.sku, it.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="pill">{it.quantity}</span>
                      <button
                        type="button"
                        className="btn catalogOutlineBtn"
                        aria-label="Increase quantity"
                        onClick={() => {
                          bumpCartSku(slug, it.sku, 1)
                          setCart(readCartForSlug(slug))
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="orderNowSummaryLineTotal">{moneyCents(it.product.priceCents * it.quantity)}</div>
                </li>
              ))}
            </ul>

            <label className="orderNowSummaryCheck">
              <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
              <span className="muted">Add shipping insurance (2%)</span>
            </label>

            <div className="orderNowSummaryDivider" />

            <div className="orderNowSummarySubtotalRow">
              <span>Subtotal</span>
              <strong>{moneyCents(subtotal)}</strong>
            </div>
            {insurance ? (
              <div className="orderNowSummarySubtotalRow muted" style={{ fontSize: 14 }}>
                <span>Insurance (2%)</span>
                <span>{moneyCents(insuranceCents)}</span>
              </div>
            ) : null}
            <div className="orderNowSummarySubtotalRow orderNowSummaryTotalRow">
              <span>Total</span>
              <strong>{moneyCents(total)}</strong>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: '6px 0 0' }}>
              Tax included where applicable.
            </p>

            <div className="orderNowSummaryDivider" />

            <div style={{ fontWeight: 750, color: 'var(--text-h)', marginBottom: 8 }}>Medication Shipping Terms</div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              Prototype terms. Replace with finalized shipping, liability, and authorization language before production.
            </p>
            <label className="orderNowSummaryCheck" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="muted">I have read and agree to the shipping terms.</span>
            </label>
            <label className="orderNowSummaryCheck">
              <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} />
              <span className="muted">I authorize contact regarding my order when necessary.</span>
            </label>

            <div className="formRow" style={{ marginTop: 14 }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Date
                </div>
                <input className="input" type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} />
              </label>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Typed signature
                </div>
                <input
                  className="input"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  placeholder="First and Last Name"
                />
              </label>
            </div>

            {checkoutError ? (
              <div style={{ marginTop: 14, color: '#7a0f1c', fontSize: 13, fontWeight: 800, whiteSpace: 'pre-line' }}>
                {checkoutError}
              </div>
            ) : null}

            <div className="orderNowSummaryPayWrap">
              <button
                type="button"
                className="btn btnPrimary orderNowPayBtn"
                disabled={!agree || !contactOk || !sigName.trim() || checkoutBusy}
                style={{ opacity: !agree || !contactOk || !sigName.trim() || checkoutBusy ? 0.55 : 1 }}
                onClick={onPay}
              >
                {checkoutBusy ? 'Submitting…' : 'Submit order'}
              </button>
              <p className="muted orderNowSecureNote">
                For now, catalog payment is by <b>Zelle</b> after review. Submitting sends your order to the practice;
                you are not paying on this screen. Watch email or portal messages for amount and pay-to details.
              </p>
              <ZellePayToHint style={{ marginTop: 12 }} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
