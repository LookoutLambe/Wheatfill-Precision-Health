import Icon, { type IconName } from './Icon'
import { PROVIDER_LICENSED_STATES } from '../config/provider'

/**
 * Factual credentials strip (no testimonials/claims). Everything here is verifiable from the
 * practice's own About content + config — board certification, licensure, telehealth, HIPAA-aware.
 */
export default function TrustStrip() {
  const states = PROVIDER_LICENSED_STATES.filter(Boolean).join(', ')
  const items: Array<{ icon: IconName; label: string }> = [
    { icon: 'shield', label: 'Board-certified FNP-C' },
    { icon: 'check', label: states ? `Licensed in ${states}` : 'Licensed clinicians' },
    { icon: 'pulse', label: '100% Telehealth' },
    { icon: 'target', label: 'Evidence-based care' },
  ]

  return (
    <div className="trustStrip" role="list" aria-label="Practice credentials">
      {items.map((it) => (
        <div className="trustStripItem" role="listitem" key={it.label}>
          <span className="trustStripIcon" aria-hidden="true">
            <Icon name={it.icon} size={17} />
          </span>
          <span className="trustStripLabel">{it.label}</span>
        </div>
      ))}
    </div>
  )
}
