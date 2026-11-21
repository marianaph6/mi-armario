import { useObjectUrl } from '../lib/useObjectUrl'

export function FotoPrenda({ blob, alt, className = '' }: { blob?: Blob | null; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  return (
    <div className={`overflow-hidden bg-linea ${className}`}>
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        !blob && (
          // prenda que llegó de la nube y todavía no tiene su foto en este teléfono
          <span role="img" aria-label={`${alt} (sin foto)`} className="flex h-full w-full items-center justify-center text-xl opacity-40">
            📷
          </span>
        )
      )}
    </div>
  )
}
