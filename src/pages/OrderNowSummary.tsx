import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PRACTICE_PUBLIC_NAME } from '../config/provider'
import { resolvedFulfillmentPharmacyName } from '../lib/practiceIntegrationDisplay'
import { CATALOG_HIGHLIGHT_PRODUCTS, DEFAULT_CATALOG_PARTNER_SLUG } from '../data/catalogHighlight'
import { US_STATE_OPTIONS } from '../data/usStates'
import { catalogPartnerTitle } from '../lib/orderNowDisplay'
import { readCartForSlug, writeCartForSlug } from '../lib/pharmacyCart'
import { apiGet, apiPost, fetchApiSession, type ApiSessionSnapshot } from '../api/client'
import { navigateToStripeHostedUrl } from '../lib/stripeHostedNavigation'
import { CATALOG_OFFLINE_BODY_ORDER_SUMMARY } from '../lib/catalogOfflineCopy'

type Product = { sku: string; name: string; subtitle: string; priceCents: number; currency: string }
type PartnerResp = { partner: { slug: string; name: string; products: Product[] } }

function moneyCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function moneyPlain(cents: number) {
  return (cents / 100).toFixed(2)
}

export default function OrderNowSummary() {
  const { slug = '' } = useParams()
  const isPrimaryCatalog = slug === DEFAULT_CATALOG_PARTNER_SLUG
  const [partner, setPartner] = useState<PartnerResp['partner'] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [offlineCatalog, setOfflineCatalog] = useState(false)
  // Must hydrate from localStorage on first render; an empty default + write effect was clearing the cart
  // on load (effect wrote {} before the read effect ran). See wph_pharmacy_cart_v1 in pharmacyCart.ts.
  const [cart, setCart] = useState<Record<string, number>>(() => (slug ? readCartForSlug(slug) : {}))
  const [agree, setAgree] = useState(false)
  const [contactOk, setContactOk] = useState(false)
  const [sigName, setSigName] = useState('')
  const [sigDate, setSigDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [insurance, setInsurance] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [shipStreet, setShipStreet] = useState('')
  const [shipCity, setShipCity] = useState('')
  const [shipState, setShipState] = useState('')
  const [shipZip, setShipZip] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [apiSession, setApiSession] = useState<ApiSessionSnapshot | null>(null)

  useEffect(() => {
    fetchApiSession().then(setApiSession)
  }, [])

  /** Patient JWT/session only — not “any legacy token” (providers/admins would hit 403 on /v1/patient/*). */
  const isPatientSession =
    Boolean(apiSession?.ok && apiSession.authenticated && apiSession.role === 'patient')
  const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

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
            name: resolvedFulfillmentPharmacyName(),
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

  useLayoutEffect(() => {
    if (!slug) return
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
  const shippingCents = slug === 'hallandale' ? 2500 : 0
  const total = subtotal + insuranceCents + shippingCents

  const onCheckout = () => {
    setCheckoutError(null)
    if (!partner || items.length === 0) return
    if (!agree) {
      setCheckoutError('Please read and agree to the medication shipping terms and conditions above.')
      return
    }
    if (!contactOk) {
      setCheckoutError('Please agree to the contact / privacy authorization to continue.')
      return
    }
    if (!shipStreet.trim() || !shipCity.trim() || !shipState || !shipZip.trim()) {
      setCheckoutError('Please complete street, city, state, and zip for shipping.')
      return
    }
    if (!sigName.trim()) {
      setCheckoutError('Please type your name as a signature to continue.')
      return
    }
    if (!isPatientSession && !emailOk(contactEmail)) {
      setCheckoutError('Please enter a valid email so we can confirm your order and reach you if needed.')
      return
    }

    setCheckoutBusy(true)
    ;(async () => {
      try {
        const session = await fetchApiSession()
        const patientOk = session.ok && session.authenticated && session.role === 'patient'

        const body = {
          partnerSlug: partner.slug,
          items: items.map((it) => ({ sku: it.sku, quantity: it.quantity })),
          agreedToShippingTerms: agree,
          contactPermission: contactOk,
          signatureName: sigName.trim(),
          signatureDate: sigDate,
          shippingInsurance: insurance,
          shippingAddress1: shipStreet.trim(),
          shippingCity: shipCity.trim(),
          shippingState: shipState.trim(),
          shippingPostalCode: shipZip.trim(),
        }

        const wantsEmbedded = !!(import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY
        if (patientOk) {
          const res = await apiPost<{
            checkoutUrl: string | null
            checkoutClientSecret?: string | null
            orderId?: string
            totalCents?: number
          }>(
            '/v1/patient/orders/pharmacy',
            { ...body, uiMode: wantsEmbedded ? 'embedded' : 'redirect' },
          )
          if (wantsEmbedded && res.checkoutClientSecret) {
            try {
              sessionStorage.setItem(`wph_checkout_cs_${partner.slug}`, res.checkoutClientSecret)
            } catch {
              // ignore
            }
            window.location.assign(`/order-now/${encodeURIComponent(partner.slug)}/checkout`)
            return
          }
          if (res.checkoutUrl) {
            if (!navigateToStripeHostedUrl(res.checkoutUrl)) {
              setCheckoutError('Could not open the secure payment page. Please try again.')
            }
            return
          }
          writeCartForSlug(slug, {})
          setCheckoutError(null)
          alert(
            res.orderId
              ? `Order received (ref ${res.orderId}). No payment page opened—usually the API needs STRIPE_SECRET_KEY or Stripe is not the active payment method. Your care team can still collect payment.`
              : 'Order submitted. No payment page opened (Stripe may not be configured on the server). Your care team will follow up with next steps.',
          )
          return
        }

        const res = await apiPost<{
          orderId: string
          totalCents: number
          checkoutUrl: string | null
          checkoutClientSecret?: string | null
        }>(
          '/v1/public/orders/pharmacy',
          { ...body, contactEmail: contactEmail.trim(), uiMode: wantsEmbedded ? 'embedded' : 'redirect' },
          '',
        )
        if (wantsEmbedded && res.checkoutClientSecret) {
          try {
            sessionStorage.setItem(`wph_checkout_cs_${partner.slug}`, res.checkoutClientSecret)
          } catch {
            // ignore
          }
          window.location.assign(`/order-now/${encodeURIComponent(partner.slug)}/checkout`)
          return
        }
        if (res.checkoutUrl) {
          if (!navigateToStripeHostedUrl(res.checkoutUrl)) {
            setCheckoutError('Could not open the secure payment page. Please try again.')
          }
          return
        }
        writeCartForSlug(slug, {})
        setCheckoutError(null)
        alert(
          `Order received. Reference: ${res.orderId}. No payment page opened—usually the API needs STRIPE_SECRET_KEY or Stripe is not the active method in provider settings. Your care team can still collect payment.`,
        )
      } catch (e: unknown) {
        setCheckoutError(String((e as Error)?.message || e))
      } finally {
        setCheckoutBusy(false)
      }
    })()
  }

  const catalogPath = `/order-now/${encodeURIComponent(slug)}`
  const canCheckOut =
    agree &&
    contactOk &&
    shipStreet.trim() &&
    shipCity.trim() &&
    shipState &&
    shipZip.trim() &&
    sigName.trim() &&
    (isPatientSession || emailOk(contactEmail))
  const itemsSummaryText = items.map((it) => `${it.product.name} (x${it.quantity})`).join(', ')

  return (
    <div className="page orderNowSummaryPage orderNowSummaryPage--wide">
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
          <Link to={catalogPath}>{partner ? catalogPartnerTitle(partner.name) : 'Catalog'}</Link>
          <span className="wphBreadcrumbsSep" aria-hidden="true">
            /
          </span>
          <span className="wphBreadcrumbsCurrent">Checkout</span>
        </nav>
        <header className="orderNowCheckoutHeader">
          <div className="orderNowCheckoutHeaderText">
            <p className="orderNowCheckoutKicker">Secure checkout</p>
            <div className="orderNowCheckoutTitleRow">
              <h1 className="orderNowCheckoutTitle">Checkout</h1>
              <Link to={catalogPath} className="orderNowCheckoutBack btn">
                Continue shopping
              </Link>
            </div>
            <p className="orderNowCheckoutLead">
              {items.length > 0 ? (
                <>
                  Enter shipping and signature below, then use <strong>Check out</strong> to open the payment link.
                </>
              ) : (
                <>
                  Your bag lives in the site header (left). Add medication from the catalog, then return here. When
                  your cart has at least one line, the agreements, shipping, and pay steps unlock on this page.
                </>
              )}
            </p>
            <p className="orderNowCheckoutMeta">
              <Link to={catalogPath} className="orderNowCheckoutLink">
                Back to catalog
              </Link>
              <span className="orderNowCheckoutMetaSep" aria-hidden="true">
                ·
              </span>
              <span>Click the bag in the header to add or change items. The panel slides in from the left.</span>
            </p>
          </div>
        </header>

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
          <div className="orderNowOffline orderNowOffline--subtle" role="status" style={{ marginTop: 14 }}>
            {CATALOG_OFFLINE_BODY_ORDER_SUMMARY}
          </div>
        ) : null}

        {!partner && !loadError ? <p className="muted">Loading…</p> : null}

        {partner && !loadError ? (
          <>
            <p className="muted orderNowSummaryPartnerLine" style={{ marginTop: 10 }}>
              {isPrimaryCatalog ? (
                <>
                  <strong>{PRACTICE_PUBLIC_NAME}</strong> · partner: {resolvedFulfillmentPharmacyName()}
                </>
              ) : (
                <>Catalog: {catalogPartnerTitle(partner.name)}</>
              )}
            </p>

            <section className="card" style={{ marginTop: 16, padding: '20px 18px' }}>
              <h2 className="orderNowTermsHeading">Medication Shipping Terms and Conditions</h2>
              <div className="orderNowTermsProse">
                <p>
                  {PRACTICE_PUBLIC_NAME} is committed to ensuring the safe and timely delivery of your medications.
                  Please read the following terms and conditions carefully regarding the shipping of your medication.
                </p>
                <h3>Disclaimer of Responsibility</h3>
                <p>
                  {PRACTICE_PUBLIC_NAME} is not responsible for any loss, damage, or theft of medication once it has
                  shipped from the dispensing pharmacy or from the {PRACTICE_PUBLIC_NAME} clinic. Our responsibility
                  concludes once the medication is tendered to the shipping carrier.
                </p>
                <h3>Lost, Damaged, or Stolen Shipments</h3>
                <p>
                  <strong>Medication shipped directly from a pharmacy:</strong> If your medication was shipped
                  directly from the pharmacy, you will need to contact the pharmacy directly to address any issues
                  regarding lost, damaged, or stolen shipments.
                </p>
                <p>
                  <strong>Medication shipped from the {PRACTICE_PUBLIC_NAME} clinic (with insurance):</strong> If your
                  medication was shipped from the {PRACTICE_PUBLIC_NAME} clinic, and you purchased additional shipping
                  insurance at the time of your order, {PRACTICE_PUBLIC_NAME} will submit a claim on your behalf through
                  the United States Postal Service (USPS) for the lost, damaged, or stolen medication.
                </p>
                <p>
                  <strong>Medication shipped from the {PRACTICE_PUBLIC_NAME} clinic (without insurance):</strong> If
                  your medication was shipped from the {PRACTICE_PUBLIC_NAME} clinic without additional shipping
                  insurance, you will be responsible for reordering the medication and paying the full price.
                </p>
              </div>
            </section>

            {items.length === 0 ? (
              <>
                <p className="orderNowTermsGated" role="status">
                  To complete purchase, add one or more products to your bag. The agreement checkboxes, shipping, and
                  pay button appear on this page once you have a cart line to check out.
                </p>
                <div className="orderNowSummaryEmpty card">
                  <p className="orderNowSummaryEmptyLead">
                    Your cart is empty. Browse the catalog to add vials, then return here. Use the bag in the header to
                    review the cart and quantity before you check out.
                  </p>
                  <div className="btnRow" style={{ marginTop: 16 }}>
                    <Link to={catalogPath} className="btn btnPrimary" style={{ textDecoration: 'none' }}>
                      Browse catalog
                    </Link>
                    <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
                      All catalogs
                    </Link>
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {partner && items.length > 0 ? (
          <>
            <label className="orderNowSummaryCheck" style={{ marginTop: 16 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="muted">
                I have read and agree with the medication shipping terms and conditions as written above.
              </span>
            </label>
            <label className="orderNowSummaryCheck">
              <input type="checkbox" checked={contactOk} onChange={(e) => setContactOk(e.target.checked)} />
              <span className="muted">
                By checking this box, I authorize {PRACTICE_PUBLIC_NAME} to contact me regarding my order only when
                necessary. We value your privacy: your information will not be shared with outside entities in
                accordance with applicable privacy guidelines, and you may revoke this permission by contacting us.
              </span>
            </label>

            <div className="orderNowCheckoutGrid" style={{ marginTop: 22 }}>
              <div className="card" style={{ padding: '18px 16px' }}>
                <h2 className="orderNowPanelTitle">Calculate shipping</h2>
                <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
                  Where to ship — used when your order is processed.
                </p>
                {isPatientSession ? null : (
                  <label>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      Email <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </div>
                    <input
                      className="input"
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                )}
                <label>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Street address <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </div>
                  <input
                    className="input"
                    value={shipStreet}
                    onChange={(e) => setShipStreet(e.target.value)}
                    autoComplete="street-address"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </label>
                <div className="formRow" style={{ marginTop: 10 }}>
                  <label style={{ flex: '1 1 50%' }}>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      City <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </div>
                    <input
                      className="input"
                      value={shipCity}
                      onChange={(e) => setShipCity(e.target.value)}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                      State <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </div>
                    <select
                      className="select"
                      value={shipState}
                      onChange={(e) => setShipState(e.target.value)}
                      style={{ minWidth: 0 }}
                    >
                      {US_STATE_OPTIONS.map((o, i) => (
                        <option key={o.value || `s-${i}`} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label style={{ display: 'block', marginTop: 10 }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    Zip <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </div>
                  <input
                    className="input"
                    value={shipZip}
                    onChange={(e) => setShipZip(e.target.value)}
                    autoComplete="postal-code"
                    inputMode="text"
                    style={{ maxWidth: 160 }}
                  />
                </label>
                <label className="orderNowSummaryCheck" style={{ marginTop: 12 }}>
                  <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} />
                  <span className="muted">Add shipping insurance (2% of subtotal, optional)</span>
                </label>
              </div>

              <div className="card" style={{ padding: '18px 16px' }}>
                <h2 className="orderNowPanelTitle">Order summary</h2>
                <div
                  className="muted"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 12,
                    background: 'rgba(10, 30, 63, 0.04)',
                  }}
                >
                  {itemsSummaryText}
                </div>
                <div className="orderNowSummaryTableRow">
                  <span>Cart subtotal</span>
                  <input
                    className="input"
                    readOnly
                    value={moneyPlain(subtotal)}
                    style={{ textAlign: 'right', maxWidth: 100 }}
                    aria-label="Cart subtotal"
                  />
                </div>
                <div className="orderNowSummaryTableRow">
                  <span>Shipping</span>
                  <input
                    className="input"
                    readOnly
                    value={moneyPlain(shippingCents)}
                    style={{ textAlign: 'right', maxWidth: 100 }}
                    aria-label="Shipping"
                  />
                </div>
                {insurance ? (
                  <div className="orderNowSummaryTableRow">
                    <span>Shipping insurance (2%)</span>
                    <input
                      className="input"
                      readOnly
                      value={moneyPlain(insuranceCents)}
                      style={{ textAlign: 'right', maxWidth: 100 }}
                      aria-label="Shipping insurance"
                    />
                  </div>
                ) : null}
                <div className="orderNowSummaryDivider" style={{ margin: '14px 0' }} />
                <div className="orderNowSummaryTableRow" style={{ fontSize: 18, fontWeight: 800 }}>
                  <span>Total due</span>
                  <span style={{ textAlign: 'right' }}>{moneyCents(total)}</span>
                </div>
                <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
                  Check out opens a secure card payment page with <strong>this</strong> total. Any adjustments are
                  confirmed by the office.
                </p>
              </div>
            </div>

            <div className="formRow" style={{ marginTop: 18, flexWrap: 'wrap' }}>
              <label>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Date <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </div>
                <input className="input" type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} />
              </label>
              <label style={{ flex: '1 1 200px' }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                  Typed signature <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </div>
                <input
                  className="input"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  placeholder="First and last name"
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            {checkoutError ? (
              <div style={{ marginTop: 14, color: '#7a0f1c', fontSize: 13, fontWeight: 800, whiteSpace: 'pre-line' }}>
                {checkoutError}
              </div>
            ) : null}

            <div className="orderNowSummaryPayWrap" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="btn btnPrimary orderNowPayBtn"
                disabled={!canCheckOut || checkoutBusy}
                style={{ opacity: !canCheckOut || checkoutBusy ? 0.55 : 1 }}
                onClick={onCheckout}
              >
                {checkoutBusy ? 'Opening checkout…' : 'Check out'}
              </button>
              <p className="muted orderNowSecureNote" style={{ textAlign: 'left' }}>
                Your checkout opens securely. The practice confirms fulfillment details after payment.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
