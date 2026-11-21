import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { FotoPrenda } from '../components/FotoPrenda'
import { db, type Categoria, type Ocasion, type Prenda } from '../db/schema'
import { CATEGORIAS, ESTADOS, OCASIONES, activa, categoriaDe, estadoDe } from '../logic/catalogo'

type FiltroCat = Categoria | 'todas'

const OPC_CATEGORIA = [{ id: 'todas' as const, label: 'Todo' }, ...CATEGORIAS]

/** Resumen del estado del clóset; lleva a la pantalla donde se gestiona. */
function ResumenEstado({ prendas }: { prendas: Prenda[] }) {
  const total = prendas.length
  const cuenta = ESTADOS.map((e) => ({ ...e, n: prendas.filter((p) => p.estado === e.id).length }))
  const libres = cuenta[0].n
  const pendientes = cuenta.slice(1).filter((e) => e.n > 0)
  return (
    <Link to="/closet/estado" className="mb-4 block rounded-2xl border border-linea bg-papel p-3 active:bg-linea">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">{libres}</span> <span className="text-suave">de {total} disponibles</span>
        </p>
        <p className="flex shrink-0 items-center gap-2 text-sm text-suave">
          {pendientes.length === 0
            ? 'Todo listo'
            : pendientes.map((e) => (
                <span key={e.id} aria-label={`${e.n} ${e.corto.toLowerCase()}`}>
                  {e.emoji} {e.n}
                </span>
              ))}
          <span className="text-lg leading-none">›</span>
        </p>
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-linea">
        {cuenta.map((e) => (e.n ? <span key={e.id} style={{ width: `${(e.n / total) * 100}%`, background: e.color }} /> : null))}
      </div>
    </Link>
  )
}

export function Closet() {
  const prendas = useLiveQuery(() => db.prendas.orderBy('creada').reverse().toArray(), [])
  const [cat, setCat] = useState<FiltroCat>('todas')
  const [ocasion, setOcasion] = useState<Ocasion | null>(null)

  const visibles = useMemo(
    () =>
      (prendas ?? [])
        .filter((p) => (cat === 'todas' || p.categoria === cat) && (ocasion === null || p.ocasiones.includes(ocasion)))
        // lo que está de salida (donar o botar) va al final
        .sort((a, b) => Number(!activa(a)) - Number(!activa(b))),
    [prendas, cat, ocasion],
  )

  const total = prendas?.length ?? 0
  // solo se muestran los filtros de tipos que existen en el clóset
  const categorias = OPC_CATEGORIA.filter((c) => c.id === 'todas' || prendas?.some((p) => p.categoria === c.id))

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
          {prendas && <ResumenEstado prendas={prendas} />}

          <div className="space-y-2">
            <Chips opciones={categorias} seleccion={[cat]} onToggle={setCat} enFila tamano="sm" />
            <Chips
              opciones={OCASIONES}
              seleccion={ocasion ? [ocasion] : []}
              onToggle={(id) => setOcasion(ocasion === id ? null : id)}
              enFila
              tamano="sm"
            />
          </div>

          {prendas && visibles.length === 0 ? (
            <p className="mt-16 text-center text-suave">No hay prendas con esos filtros.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {visibles.map((p) => {
                const e = estadoDe(p.estado)
                return (
                  <li key={p.id}>
                    <Link to={`/closet/${p.id}`} className={`relative block ${activa(p) ? '' : 'opacity-50'}`}>
                      <FotoPrenda
                        blob={p.miniatura}
                        alt={p.nombre || p.subtipo || categoriaDe(p.categoria).label}
                        className="aspect-[3/4] rounded-xl"
                      />
                      {p.estado !== 'limpia' && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-papel/90 px-1.5 py-0.5 text-xs" aria-label={e.label} title={e.label}>
                          {e.emoji}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
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
