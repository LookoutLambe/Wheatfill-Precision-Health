import { type ImgHTMLAttributes, useState } from 'react'
import { imageKitUrl } from '../config/imagekit'

type ImageKitImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & {
  /** Path in the ImageKit media library, e.g. "site/hero.jpg" (no leading slash needed). */
  path: string
  /** Local image shown if the ImageKit asset is missing/unreachable (keeps the page from breaking). */
  fallbackSrc?: string
  /** Widths (px) to emit as a responsive srcSet. */
  widths?: number[]
  /** Extra ImageKit transforms appended after `f-auto,q-auto` (e.g. "ar-4-5,fo-face"). */
  transform?: string
}

/**
 * Renders an <img> served through ImageKit with automatic format/quality and a responsive srcSet.
 * Falls back to a local image if the ImageKit asset 404s, so a missing upload never breaks the page.
 */
export default function ImageKitImage({
  path,
  fallbackSrc,
  widths = [480, 768, 1200],
  transform,
  alt = '',
  sizes,
  ...rest
}: ImageKitImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed && fallbackSrc) {
    return <img src={fallbackSrc} alt={alt} {...rest} />
  }

  const base = `f-auto,q-auto${transform ? `,${transform}` : ''}`
  const src = imageKitUrl(path, `${base}${widths.length ? `,w-${widths[widths.length - 1]}` : ''}`)
  const srcSet = widths.map((w) => `${imageKitUrl(path, `${base},w-${w}`)} ${w}w`).join(', ')

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes ?? '100vw'}
      alt={alt}
      loading={rest.loading ?? 'lazy'}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
