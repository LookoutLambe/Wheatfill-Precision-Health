import catalogVialPhoto from '../assets/catalog-vial.png'

export type CatalogVialFamily = 'tirzepatide' | 'semaglutide' | 'neutral'

type Props = { family?: CatalogVialFamily }

/** Product thumbnail: shared studio vial photo for all catalog SKUs. */
export default function CatalogVialThumb(_props: Props) {
  return (
    <div className="pharmacyVialThumb" aria-hidden="true">
      <img className="catalogVialPhoto" src={catalogVialPhoto} alt="" width={112} height={168} decoding="async" />
    </div>
  )
}
