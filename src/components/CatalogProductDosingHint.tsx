import { Link } from 'react-router-dom'
import { formatDrugMgDisplay, formatListPricePerMg, parseCatalogVialName } from '../lib/catalogVialStrength'

type Props = {
  name: string
  priceCents: number
  /** Full-width band under title/price row (Order Now hub + partner catalog). */
  layout?: 'inline' | 'band'
}

/**
 * Per-vial strength + list price per mg of drug in the vial (education / shopping math only).
 */
export default function CatalogProductDosingHint({ name, priceCents, layout = 'inline' }: Props) {
  const p = parseCatalogVialName(name)
  if (!p) return null
  const perMg = formatListPricePerMg(priceCents, p.totalDrugMg)
  const inner = (
    <div className="catalogProductDosing muted">
      <strong>Vial:</strong> {formatDrugMgDisplay(p.totalDrugMg)} mg drug total ({p.mgPerMl} mg/mL × {p.volumeMl} mL).{' '}
      {perMg ? (
        <>
          <strong>List ≈</strong> {perMg} of drug in this vial.{' '}
        </>
      ) : null}
      <Link to="/medications#dosing-guide">Dosing guide</Link>
      <span className="catalogProductDosingFine"> — education only; not a prescription.</span>
    </div>
  )
  if (layout === 'band') {
    return <div className="catalogProductDosingBand">{inner}</div>
  }
  return inner
}
