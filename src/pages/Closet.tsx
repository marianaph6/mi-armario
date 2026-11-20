import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { FotoPrenda } from '../components/FotoPrenda'
import { marcarTodoLimpio } from '../db/acciones'
import { db, type Categoria, type Ocasion } from '../db/schema'
import { CATEGORIAS, OCASIONES, categoriaDe } from '../logic/catalogo'

type FiltroCat = Categoria | 'todas'
type FiltroExtra = Ocasion | 'lavar'

const OPC_CATEGORIA = [{ id: 'todas' as const, label: 'Todo' }, ...CATEGORIAS]
const OPC_EXTRA = [...OCASIONES, { id: 'lavar' as const, label: 'Para lavar', emoji: '🧺' }]

export function Closet() {
  const prendas = useLiveQuery(() => db.prendas.orderBy('creada').reverse().toArray(), [])
  const [cat, setCat] = useState<FiltroCat>('todas')
  const [extra, setExtra] = useState<FiltroExtra | null>(null)

  const visibles = useMemo(
    () =>
      (prendas ?? []).filter(
        (p) =>
          (cat === 'todas' || p.categoria === cat) &&
          (extra === null || (extra === 'lavar' ? p.estado === 'lavar' : p.ocasiones.includes(extra))),
      ),
    [prendas, cat, extra],
  )

  const total = prendas?.length ?? 0

  return (
    <>
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Mi clóset</h1>
        {total > 0 && (
          <p className="pb-1 text-sm text-suave">
            {visibles.length === total ? `${total} ${total === 1 ? 'prenda' : 'prendas'}` : `${visibles.length} de ${total}`}
          </p>
        )}
      </header>

      {prendas && total === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="mb-4 text-6xl">👚</div>
          <h2 className="text-xl font-semibold">Tu clóset está vacío</h2>
          <p className="mt-2 max-w-xs text-suave">
            Tómale una foto a cada prenda. Con eso la app podrá armarte outfits y ayudarte a usar todo lo que tienes.
          </p>
          <Link to="/closet/nueva" className="mt-6 rounded-full bg-acento px-6 py-3.5 font-semibold text-white active:bg-acento-osc">
            Agregar mi primera prenda
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Chips opciones={OPC_CATEGORIA} seleccion={[cat]} onToggle={setCat} enFila tamano="sm" />
            <Chips
              opciones={OPC_EXTRA}
              seleccion={extra ? [extra] : []}
              onToggle={(id) => setExtra(extra === id ? null : id)}
              enFila
              tamano="sm"
            />
          </div>

          {extra === 'lavar' && visibles.length > 0 && (
            <button
              type="button"
              onClick={() => confirm('¿Marcar todas las prendas como limpias?') && marcarTodoLimpio()}
              className="mt-3 w-full rounded-full border border-tinta py-2.5 text-sm font-semibold"
            >
              ✨ Ya lavé todo
            </button>
          )}

          {prendas && visibles.length === 0 ? (
            <p className="mt-16 text-center text-suave">No hay prendas con esos filtros.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {visibles.map((p) => (
                <li key={p.id}>
                  <Link to={`/closet/${p.id}`} className="relative block">
                    <FotoPrenda
                      blob={p.miniatura}
                      alt={p.nombre || p.subtipo || categoriaDe(p.categoria).label}
                      className="aspect-[3/4] rounded-xl"
                    />
                    {p.estado === 'lavar' && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-papel/90 px-1.5 py-0.5 text-xs">🧺</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/closet/nueva"
            aria-label="Agregar prenda"
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-3xl leading-none font-light text-white shadow-lg shadow-acento/30 active:bg-acento-osc"
          >
            +
          </Link>
        </>
      )}
    </>
  )
}
