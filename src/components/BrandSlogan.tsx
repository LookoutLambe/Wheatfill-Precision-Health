import { PRACTICE_SLOGAN } from '../config/branding'

type BrandSloganProps = {
  className?: string
  /** Default: inner pages. `hero`: peptide-style band. `landing`: home hero eyebrow. */
  variant?: 'default' | 'hero' | 'landing'
}

export function BrandSlogan({ className = '', variant = 'default' }: BrandSloganProps) {
  const v =
    variant === 'hero'
      ? 'brandSlogan brandSlogan--hero'
      : variant === 'landing'
        ? 'brandSlogan brandSlogan--landing'
        : 'brandSlogan'
  return (
    <p className={[v, className].filter(Boolean).join(' ')}>
      {PRACTICE_SLOGAN}
    </p>
  )
}
