import { useObjectUrl } from '../lib/useObjectUrl'

export function FotoPrenda({ blob, alt, className = '' }: { blob?: Blob | null; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  return (
    <div className={`overflow-hidden bg-linea ${className}`}>
      {url && <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" />}
    </div>
  )
}
