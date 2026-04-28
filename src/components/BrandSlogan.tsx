import { PRACTICE_SLOGAN } from '../config/branding'

type BrandSloganProps = {
  className?: string
}

/** Same pill + script styling on every page (see `.brandSlogan` in App.css). */
export function BrandSlogan({ className = '' }: BrandSloganProps) {
  return <p className={['brandSlogan', className].filter(Boolean).join(' ')}>{PRACTICE_SLOGAN}</p>
}
