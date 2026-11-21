import type { Prenda } from '../db/schema'
import { CATEGORIAS, estadoDe } from '../logic/catalogo'
import { FotoPrenda } from './FotoPrenda'

/** Cuadrícula de prendas por categoría para elegir varias con un toque. */
export function SelectorPrendas({ prendas, seleccion, alternar }: { prendas: Prenda[]; seleccion: number[]; alternar: (id: number) => void }) {
  return CATEGORIAS.map((c) => {
    const delGrupo = prendas.filter((p) => p.categoria === c.id)
    if (delGrupo.length === 0) return null
    return (
      <section key={c.id}>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">
          {c.emoji} {c.label}
        </h2>
        <ul className="grid grid-cols-4 gap-2">
          {delGrupo.map((p) => {
            const activa = seleccion.includes(p.id)
            return (
              <li key={p.id}>
                <button type="button" aria-pressed={activa} onClick={() => alternar(p.id)} className="relative block w-full">
                  <FotoPrenda
                    blob={p.miniatura}
                    alt={p.nombre || p.subtipo || c.label}
                    className={`aspect-[3/4] rounded-lg ${activa ? 'ring-2 ring-acento ring-offset-2 ring-offset-crema' : ''}`}
                  />
                  {activa && (
                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-acento text-xs text-white">✓</span>
                  )}
                  {p.estado !== 'limpia' && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-papel/90 px-1 text-[10px]" aria-label={estadoDe(p.estado).label}>
                      {estadoDe(p.estado).emoji}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  })
}
