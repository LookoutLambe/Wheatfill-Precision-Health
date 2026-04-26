/**
 * Product-style vial photos for /peptides (education only; not a shop).
 * User-supplied reference images; our overlay text still says “illustration”
 * and “not a product listing from us.”
 */
import type { PeptideId } from './peptideEducation'
import vialBpc from '../assets/peptides/vial-bpc157.png'
import vialCjc from '../assets/peptides/vial-cjc-ipamorelin.png'
import vialGhk from '../assets/peptides/vial-ghk-cu.png'
import vialNad from '../assets/peptides/vial-nad.png'
import vialSemax from '../assets/peptides/vial-semax-selank.png'
import vialTb from '../assets/peptides/vial-tb500.png'

/** Ribbon strip under the photo: matches the label “band” color of each vial image. */
export type VialRibbonId = 'bpc' | 'cjc' | 'ghk' | 'tb' | 'nad' | 'semax'

const BY_ID: Record<PeptideId, string> = {
  bpc157: vialBpc,
  cjcipa: vialCjc,
  ghkcu: vialGhk,
  semax: vialSemax,
  tb500: vialTb,
  motsc: vialNad,
  aod: vialCjc,
  ta1: vialBpc,
  kpv: vialGhk,
}

const RIBBON_BY_ID: Record<PeptideId, VialRibbonId> = {
  bpc157: 'bpc',
  cjcipa: 'cjc',
  ghkcu: 'ghk',
  semax: 'semax',
  tb500: 'tb',
  motsc: 'nad',
  aod: 'cjc',
  ta1: 'bpc',
  kpv: 'ghk',
}

export function peptideVialImageSrc(id: PeptideId): string {
  return BY_ID[id]
}

export function peptideVialRibbonClass(id: PeptideId): string {
  return `peptideCardVialLabel--${RIBBON_BY_ID[id]}`
}
