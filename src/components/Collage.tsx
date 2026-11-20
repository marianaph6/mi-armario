import type { Prenda } from '../db/schema'
import { categoriaDe } from '../logic/catalogo'
import { FotoPrenda } from './FotoPrenda'

/** Mosaico con las fotos de las prendas de un outfit (hasta 4). */
export function Collage({ prendas, className = '' }: { prendas: Prenda[]; className?: string }) {
  const visibles = prendas.slice(0, 4)
  const extra = prendas.length - visibles.length
  const n = visibles.length
  return (
    <div className={`grid aspect-square gap-0.5 overflow-hidden rounded-xl bg-linea ${n <= 1 ? 'grid-cols-1' : 'grid-cols-2'} ${className}`}>
      {visibles.map((p, i) => (
        <div key={p.id} className={`relative min-h-0 ${n === 3 && i === 0 ? 'row-span-2' : ''}`}>
          <FotoPrenda blob={p.miniatura} alt={p.nombre || p.subtipo || categoriaDe(p.categoria).label} className="h-full w-full" />
          {extra > 0 && i === 3 && (
            <span className="absolute inset-0 flex items-center justify-center bg-tinta/55 text-sm font-semibold text-white">+{extra}</span>
          )}
        </div>
      ))}
    </div>
  )
}
