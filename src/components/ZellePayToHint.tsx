import type { CSSProperties } from 'react'

import { ZELLE_RECIPIENTS } from '../config/provider'

type Props = {
  style?: CSSProperties
}

export default function ZellePayToHint({ style }: Props) {
  const { brett, bridgette } = ZELLE_RECIPIENTS
  return (
    <p
      className="muted zellePayToHint"
      style={{ fontSize: 13, lineHeight: 1.5, marginTop: 10, marginBottom: 0, ...style }}
    >
      <strong>Zelle numbers</strong> (only send when the practice confirms amount and recipient for your order):{' '}
      {brett.label}{' '}
      <a href={brett.telHref}>{brett.display}</a>
      {' · '}
      {bridgette.label}{' '}
      <a href={bridgette.telHref}>{bridgette.display}</a>
    </p>
  )
}
