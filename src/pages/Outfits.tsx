import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { Collage } from '../components/Collage'
import { db, type Ocasion } from '../db/schema'
import { haceCuanto } from '../lib/fechas'
import { prendasDe, usePrendasPorId } from '../lib/usePrendas'
import { OCASIONES } from '../logic/catalogo'

const OPCIONES = [{ id: 'todas' as const, label: 'Todos' }, ...OCASIONES]

export function Outfits() {
  const outfits = useLiveQuery(() => db.outfits.orderBy('id').reverse().toArray(), [])
  const porId = usePrendasPorId()
  const [filtro, setFiltro] = useState<Ocasion | 'todas'>('todas')

  const listo = outfits && porId
  const visibles = (outfits ?? []).filter((o) => filtro === 'todas' || o.ocasion === filtro)
  const nuevoUrl = `/outfits/nuevo${filtro !== 'todas' ? `?ocasion=${filtro}` : ''}`

  return (
    <>
      <header className="mb-4 flex items-end justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Outfits</h1>
        {outfits && outfits.length > 0 && <p className="pb-1 text-sm text-suave">{outfits.length} guardados</p>}
      </header>

      {listo && outfits.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="mb-4 text-6xl">🧩</div>
          <h2 className="text-xl font-semibold">Aún no tienes outfits</h2>
          <p className="mt-2 max-w-xs text-suave">
            {porId.size === 0
              ? 'Primero agrega prendas a tu clóset; luego podrás combinarlas aquí.'
              : 'Combina tus prendas y guarda las mezclas que te gustan, para no tener que pensarlas otra vez.'}
          </p>
          <Link
            to={porId.size === 0 ? '/closet/nueva' : '/outfits/nuevo'}
            className="mt-6 rounded-full bg-acento px-6 py-3.5 font-semibold text-white active:bg-acento-osc"
          >
            {porId.size === 0 ? 'Agregar prenda' : 'Armar mi primer outfit'}
          </Link>
        </div>
      ) : (
        listo && (
          <>
            <Chips opciones={OPCIONES} seleccion={[filtro]} onToggle={setFiltro} enFila tamano="sm" />

            {visibles.length === 0 ? (
              <p className="mt-16 text-center text-suave">No tienes outfits para esta ocasión.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3">
                {visibles.map((o) => {
                  const ocasion = OCASIONES.find((x) => x.id === o.ocasion)!
                  return (
                    <li key={o.id}>
                      <Link to={`/outfits/${o.id}`} className="relative block">
                        <Collage prendas={prendasDe(o.prendaIds, porId)} />
                        {o.favorito && <span className="absolute top-1.5 right-1.5 rounded-full bg-papel/90 px-1.5 py-0.5 text-xs">⭐</span>}
                        <p className="mt-1.5 truncate text-[15px] font-semibold">{o.nombre || `${ocasion.label} #${o.id}`}</p>
                        <p className="text-xs text-suave">
                          {ocasion.emoji} {ocasion.label} · {haceCuanto(o.ultimoUso)}
                        </p>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            <Link
              to={nuevoUrl}
              aria-label="Nuevo outfit"
              className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-10 flex h-14 w-14 items-center justify-center rounded-full bg-acento text-3xl leading-none font-light text-white shadow-lg shadow-acento/30 active:bg-acento-osc"
            >
              +
            </Link>
          </>
        )
      )}
    </>
  )
}
