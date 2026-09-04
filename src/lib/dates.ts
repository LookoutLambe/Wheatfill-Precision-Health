/** Local-time date helpers. These deliberately avoid toISOString(), which converts to UTC and
 *  can report yesterday's date for anyone west of Greenwich in the evening. */

/** `YYYY-MM-DD` in the visitor's own timezone. */
export function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** `09:30` -> `9:30 AM`. Returns the input unchanged if it is not a HH:MM string. */
export function timeLabel24To12(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':').map((x) => Number(x))
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return hhmm
  const h = Math.max(0, Math.min(23, hRaw | 0))
  const m = Math.max(0, Math.min(59, mRaw | 0))
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}
