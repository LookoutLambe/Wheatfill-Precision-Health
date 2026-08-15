import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATALOG_HIGHLIGHT_PRODUCTS, type CatalogHighlightProduct } from '../data/catalogHighlight'

/**
 * Interactive plan cost estimator.
 *
 * Every number comes from real practice pricing: consultation fees match the
 * cards on this page, and medication prices come from the same catalog used at
 * Order Now checkout (src/data/catalogHighlight.ts). Nothing is estimated or
 * invented — this just adds the line items together.
 */

// Keep in sync with the consultation-fee cards on the Pricing page.
const NEW_PATIENT_FEE_CENTS = 11000
const ESTABLISHED_FEE_CENTS = 8500

const FAMILIES = [
  { key: 'semaglutide', label: 'Semaglutide' },
  { key: 'tirzepatide', label: 'Tirzepatide' },
] as const

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, '')}`
}

export default function PlanCostEstimator() {
  const [family, setFamily] = useState<CatalogHighlightProduct['family']>('semaglutide')
  const [visit, setVisit] = useState<'new' | 'established'>('new')

  const options = useMemo(() => CATALOG_HIGHLIGHT_PRODUCTS.filter((p) => p.family === family), [family])
  const [skuByFamily, setSkuByFamily] = useState<Record<string, string>>({})
  const sku = skuByFamily[family] || options[0]?.sku || ''
  const product = options.find((p) => p.sku === sku) || options[0]

  const visitFeeCents = visit === 'new' ? NEW_PATIENT_FEE_CENTS : ESTABLISHED_FEE_CENTS
  const visitLabel = visit === 'new' ? 'New patient consultation' : 'Established patient visit'
  const firstMonthCents = product ? product.priceCents + visitFeeCents : 0

  return (
    <div className="glp1conv" role="group" aria-label="Plan cost estimator">
      <div className="glp1convHead">
        <span className="glp1convEyebrow">Cost estimator</span>
        <span className="glp1convLive" aria-hidden="true">
          <span className="glp1convDot" />
          Live
        </span>
      </div>

      <p className="glp1convLead">
        Build your plan and see the <strong>real numbers</strong> — the same prices you would pay at checkout, added up.
        No hidden fees.
      </p>

      <div className="costPickRow">
        <div>
          <span className="glp1convFieldLabel">Medication</span>
          <div className="glp1convPresets" role="group" aria-label="Medication">
            {FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={family === f.key}
                className={`glp1convChip${family === f.key ? ' isActive' : ''}`}
                onClick={() => setFamily(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="glp1convFieldLabel">Your first visit</span>
          <div className="glp1convPresets" role="group" aria-label="Visit type">
            <button
              type="button"
              aria-pressed={visit === 'new'}
              className={`glp1convChip${visit === 'new' ? ' isActive' : ''}`}
              onClick={() => setVisit('new')}
            >
              New patient · {usd(NEW_PATIENT_FEE_CENTS)}
            </button>
            <button
              type="button"
              aria-pressed={visit === 'established'}
              className={`glp1convChip${visit === 'established' ? ' isActive' : ''}`}
              onClick={() => setVisit('established')}
            >
              Established · {usd(ESTABLISHED_FEE_CENTS)}
            </button>
          </div>
        </div>
      </div>

      <label className="costVialPick">
        <span className="glp1convFieldLabel">Vial (from the Order Now catalog)</span>
        <select
          className="select"
          value={product?.sku || ''}
          onChange={(e) => setSkuByFamily((p) => ({ ...p, [family]: e.target.value }))}
        >
          {options.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} — {usd(p.priceCents)}
            </option>
          ))}
        </select>
      </label>

      {product ? (
        <div className="glp1convResult costResult">
          <div className="glp1convResultMain">
            <span className="glp1convResultMg">{usd(firstMonthCents)}</span>
            <span className="glp1convResultUnit">to get started</span>
          </div>
          <div className="costLines">
            <span className="costLine">
              <span>{visitLabel}</span>
              <span>{usd(visitFeeCents)}</span>
            </span>
            <span className="costLine">
              <span>{product.name}</span>
              <span>{usd(product.priceCents)}</span>
            </span>
            <span className="costLine costLine--after">
              <span>After that: medication {usd(product.priceCents)} per vial, follow-ups {usd(ESTABLISHED_FEE_CENTS)} as
              needed.</span>
            </span>
          </div>
        </div>
      ) : null}

      <div className="btnRow" style={{ marginTop: 14, flexWrap: 'wrap' }}>
        <Link to="/book" className="btn btnPrimary" style={{ textDecoration: 'none' }}>
          Book your visit
        </Link>
        <Link to="/order-now" className="btn" style={{ textDecoration: 'none' }}>
          Browse the full catalog
        </Link>
      </div>

      <p className="glp1convNote">
        Prices match the practice&rsquo;s current Order Now catalog and consultation fees. How long a vial lasts depends
        on your prescribed dose — your provider will walk through that with you. Labs, if needed, are separate.
      </p>
    </div>
  )
}
