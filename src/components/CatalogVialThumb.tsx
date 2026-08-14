import catalogVialPhoto from '../assets/catalog-vial.png'
import ImageKitImage from './ImageKitImage'

export type CatalogVialFamily = 'tirzepatide' | 'semaglutide' | 'neutral'

type Props = { family?: CatalogVialFamily }

/** Product thumbnail: shared studio vial photo for all catalog SKUs (served via ImageKit). */
export default function CatalogVialThumb(_props: Props) {
  return (
    <div className="pharmacyVialThumb" aria-hidden="true">
      <ImageKitImage
        path="catalog-vial.png"
        fallbackSrc={catalogVialPhoto}
        className="catalogVialPhoto"
        alt=""
        width={112}
        height={168}
        widths={[112, 224]}
        sizes="112px"
        decoding="async"
      />
    </div>
  )
}
