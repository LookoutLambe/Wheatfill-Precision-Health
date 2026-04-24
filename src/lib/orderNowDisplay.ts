/** Patient-facing catalog title: emphasize products, not a “visit a pharmacy” flow. */
export function catalogPartnerTitle(name: string) {
  return name.replace(/\s+pharmacy\s*$/i, '').trim() || name
}
