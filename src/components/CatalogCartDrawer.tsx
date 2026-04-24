import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CatalogVialThumb, { type CatalogVialFamily } from './CatalogVialThumb'
import { readCartForSlug, writeCartForSlug } from '../lib/pharmacyCart'

export type CartLineProduct = {
  sku: string
  name: string
  subtitle: string
  priceCents: number
}

function moneyCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function vialFamilyForSku(sku: string): CatalogVialFamily {
  if (sku.startsWith('TZ')) return 'tirzepatide'
  if (sku.startsWith('SEMA')) return 'semaglutide'
  return 'neutral'
}

type Props = {
  slug: string
  products: CartLineProduct[]
  /** Full catalog toolbar (default) or compact bag for top nav */
  placement?: 'toolbar' | 'header'
  className?: string
  /** Controlled open state (e.g. open when “Add to cart” on a partner page) */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function CatalogCartDrawer({
  slug,
  products,
  placement = 'toolbar',
  className = '',
  open: openProp,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isOpenControlled = openProp !== undefined
  const cartOpen = isOpenControlled ? (openProp as boolean) : uncontrolledOpen
  const setCartOpen = useCallback(
    (next: boolean) => {
      if (isOpenControlled) onOpenChange?.(next)
      else setUncontrolledOpen(next)
    },
    [isOpenControlled, onOpenChange],
  )

  const [cart, setCart] = useState<Record<string, number>>(() => readCartForSlug(slug))

  const syncFromStorage = useCallback(() => {
    setCart(readCartForSlug(slug))
  }, [slug])

  useEffect(() => {
    syncFromStorage()
  }, [slug, syncFromStorage])

  useEffect(() => {
    const onExt = (e: Event) => {
      const d = (e as CustomEvent<{ slug?: string }>).detail
      if (d?.slug && d.slug !== slug) return
      setCart((prev) => {
        const n = readCartForSlug(slug)
        return JSON.stringify(prev) === JSON.stringify(n) ? prev : n
      })
    }
    window.addEventListener('wph_pharmacy_cart', onExt)
    return () => window.removeEventListener('wph_pharmacy_cart', onExt)
  }, [slug])

  useEffect(() => {
    if (!slug) return
    writeCartForSlug(slug, cart)
  }, [cart, slug])

  useEffect(() => {
    if (cartOpen) document.documentElement.classList.add('pharmacyCartOpen')
    else document.documentElement.classList.remove('pharmacyCartOpen')
    return () => document.documentElement.classList.remove('pharmacyCartOpen')
  }, [cartOpen])

  useEffect(() => {
    if (!cartOpen) return
    const onK = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCartOpen(false)
    }
    window.addEventListener('keydown', onK)
    return () => window.removeEventListener('keydown', onK)
  }, [cartOpen, setCartOpen])

  const items = useMemo(() => {
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([sku, quantity]) => {
        const p = products.find((x) => x.sku === sku)
        return p ? { sku, quantity, product: p } : null
      })
      .filter(Boolean) as Array<{ sku: string; quantity: number; product: CartLineProduct }>
  }, [cart, products])

  const itemCount = useMemo(() => items.reduce((n, it) => n + it.quantity, 0), [items])

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.product.priceCents * it.quantity, 0),
    [items],
  )

  const closeCart = () => setCartOpen(false)

  const headerBtnClass =
    placement === 'header' ? 'pharmacyCartBtn pharmacyCartBtn--header' : 'pharmacyCartBtn'
  const badgeClass =
    placement === 'header' ? 'pharmacyCartBadge pharmacyCartBadge--header' : 'pharmacyCartBadge'

  return (
    <div className={className}>
      <button
        type="button"
        className={headerBtnClass}
        aria-label={`Shopping cart, ${itemCount} items`}
        onClick={() => setCartOpen(true)}
      >
        <span className="pharmacyCartIcon" aria-hidden="true" />
        {itemCount > 0 ? <span className={badgeClass}>{itemCount > 99 ? '99+' : itemCount}</span> : null}
      </button>

      {cartOpen ? (
        <>
          <button type="button" className="pharmacyDrawerScrim" aria-label="Close cart" onClick={closeCart} />
          <aside className="pharmacyDrawer" aria-label="Shopping cart">
            <div className="pharmacyDrawerTop">
              <h2 className="pharmacyDrawerTitle">
                Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </h2>
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
                        <div className="pharmacyDrawerLineHeader">
                          <div>
                            <div className="pharmacyDrawerLineName">{it.product.name}</div>
                            <div className="pharmacyDrawerLineMeta">
                              <span className="muted">{moneyCents(it.product.priceCents)} each</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="pharmacyDrawerTrash"
                            aria-label={`Remove ${it.product.name} from cart`}
                            onClick={() =>
                              setCart((c) => {
                                const next = { ...c }
                                delete next[it.sku]
                                return next
                              })
                            }
                          >
                            <span aria-hidden="true">🗑</span>
                          </button>
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
                  <span style={{ fontWeight: 800 }}>Estimated total</span>
                  <span className="pharmacyDrawerTotalAmt">{moneyCents(subtotal)}</span>
                </div>

                <p className="muted" style={{ fontSize: 12, lineHeight: 1.45, margin: '12px 0 0' }}>
                  Review and pay on the next step when you are ready—your care team confirms the amount.
                </p>

                <div className="pharmacyDrawerActions">
                  <button type="button" className="btn" style={{ width: '100%' }} onClick={closeCart}>
                    Continue shopping
                  </button>
                  <Link
                    to={`/order-now/${encodeURIComponent(slug)}/summary`}
                    className="btn btnPrimary"
                    style={{ width: '100%', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                    onClick={closeCart}
                  >
                    View cart
                  </Link>
                </div>
                <p className="pharmacyDrawerSecure">
                  <span className="pharmacyDrawerSecureIcon" aria-hidden="true" />
                  Secure checkout
                </p>
              </>
            )}
          </aside>
        </>
      ) : null}
    </div>
  )
}
