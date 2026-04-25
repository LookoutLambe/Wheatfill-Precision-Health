/**
 * Parse catalog display names like "Tirzepatide 25 mg/mL - 2 mL" into concentration and total drug in vial.
 * Returns null if the pattern does not match (e.g. API-driven names that differ).
 */
export type CatalogVialStrength = {
  mgPerMl: number
  volumeMl: number
  /** mg/mL × mL */
  totalDrugMg: number
}

export function parseCatalogVialName(name: string): CatalogVialStrength | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*mg\/mL\s*-\s*(\d+(?:\.\d+)?)\s*mL/i)
  if (!m) return null
  const mgPerMl = Number(m[1])
  const volumeMl = Number(m[2])
  if (!Number.isFinite(mgPerMl) || !Number.isFinite(volumeMl) || mgPerMl <= 0 || volumeMl <= 0) return null
  const totalDrugMg = mgPerMl * volumeMl
  return { mgPerMl, volumeMl, totalDrugMg }
}

/** Whole mg when close to integer, else one decimal. */
export function formatDrugMgDisplay(mg: number): string {
  const r = Math.round(mg * 10) / 10
  return Number.isInteger(r) ? String(Math.round(r)) : r.toFixed(1)
}

/** List price divided by total mg in vial (rough comparison across vial sizes). */
export function formatListPricePerMg(priceCents: number, totalDrugMg: number): string | null {
  if (!(totalDrugMg > 0)) return null
  const perMgCents = priceCents / totalDrugMg
  return `$${(perMgCents / 100).toFixed(2)}/mg`
}
