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
  /**
   * Intrinsic width / height of the source. Applied as `aspect-ratio` so the browser reserves the
   * right box before the image arrives; without it the page reflows as each image loads. Expressed
   * as a ratio rather than width/height attributes so it cannot fight a CSS-sized container.
   */
  ratio?: number
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
  ratio,
  style,
  ...rest
}: ImageKitImageProps) {
  const [failed, setFailed] = useState(false)

  const boxStyle = ratio ? { aspectRatio: String(ratio), ...style } : style

  if (failed && fallbackSrc) {
    return <img src={fallbackSrc} alt={alt} style={boxStyle} {...rest} />
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
      style={boxStyle}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
