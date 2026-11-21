import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FotoPrenda } from '../components/FotoPrenda'
import { cambiarEstado, eliminarPrendas } from '../db/acciones'
import { db, type Estado, type Prenda } from '../db/schema'
import { haceCuanto } from '../lib/fechas'
import { ESTADOS, categoriaDe, estadoDe } from '../logic/catalogo'
import { olvidadas } from '../logic/estado'

const nombreDe = (p: Prenda) => p.nombre || p.subtipo || categoriaDe(p.categoria).label

const botonChico = 'shrink-0 rounded-full border border-linea px-3 py-1.5 text-sm font-medium active:bg-linea'

function Fila({ p, detalle, children }: { p: Prenda; detalle?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Link to={`/closet/${p.id}`} className="shrink-0">
        <FotoPrenda blob={p.miniatura} alt={nombreDe(p)} className="h-14 w-11 rounded-md" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{nombreDe(p)}</p>
        <p className="truncate text-sm text-suave">{detalle ?? categoriaDe(p.categoria).label}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">{children}</div>
    </li>
  )
}

/** Qué hacer con cada estado: el botón por prenda y el de todas a la vez. */
const ACCIONES: Partial<Record<Estado, { una: string; todas: string; confirmar?: (n: number) => string; hacer: (ids: number[]) => Promise<void> }>> = {
  lavar: { una: 'Lavada', todas: 'Ya lavé todo', hacer: (ids) => cambiarEstado(ids, 'limpia') },
  arreglar: { una: 'Arreglada', todas: 'Ya arreglé todo', hacer: (ids) => cambiarEstado(ids, 'limpia') },
  donar: {
    una: 'Donada',
    todas: 'Ya las doné',
    confirmar: (n) => `${n === 1 ? 'La prenda sale' : `Las ${n} prendas salen`} del clóset y de tus outfits. ¿Continuar?`,
    hacer: eliminarPrendas,
  },
  botar: {
    una: 'Botada',
    todas: 'Ya las boté',
    confirmar: (n) => `${n === 1 ? 'La prenda sale' : `Las ${n} prendas salen`} del clóset y de tus outfits. ¿Continuar?`,
    hacer: eliminarPrendas,
  },
}

export function EstadoRopa() {
  const prendas = useLiveQuery(() => db.prendas.orderBy('creada').reverse().toArray(), [])
  if (!prendas) return null

  const total = prendas.length
  const porEstado = (e: Estado) => prendas.filter((p) => p.estado === e)
  const libres = porEstado('limpia').length
  const candidatas = olvidadas(prendas).slice(0, 8)

  const ejecutar = async (estado: Estado, ids: number[]) => {
    const a = ACCIONES[estado]!
    if (a.confirmar && !confirm(a.confirmar(ids.length))) return
    await a.hacer(ids)
  }

  return (
    <>
      <Link to="/closet" className="-ml-2 inline-block px-2 py-2 text-acento">
        ‹ Clóset
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Estado de tu ropa</h1>
      <p className="mt-1 mb-4 text-suave">
        {total === 0
          ? 'Todavía no tienes prendas.'
          : libres === total
            ? 'Todo tu clóset está disponible.'
            : `${libres} de ${total} prendas disponibles para usar.`}
      </p>

      {total > 0 && (
        <>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-linea" role="img" aria-label="Reparto de tu ropa por estado">
            {ESTADOS.map((e) => {
              const n = porEstado(e.id).length
              return n ? <span key={e.id} style={{ width: `${(n / total) * 100}%`, background: e.color }} /> : null
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ESTADOS.map((e) => {
              const n = porEstado(e.id).length
              return n ? (
                <li key={e.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                  {n} {e.corto.toLowerCase()}
                </li>
              ) : null
            })}
          </ul>
        </>
      )}

      {ESTADOS.filter((e) => e.id !== 'limpia').map((e) => {
        const lista = porEstado(e.id)
        const a = ACCIONES[e.id]!
        if (lista.length === 0) return null
        return (
          <section key={e.id} className="mt-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold">
                {e.emoji} {e.label} <span className="font-normal text-suave">({lista.length})</span>
              </h2>
              {lista.length > 1 && (
                <button type="button" onClick={() => ejecutar(e.id, lista.map((p) => p.id))} className="text-sm font-semibold text-acento">
                  {a.todas}
                </button>
              )}
            </div>
            <ul className="divide-y divide-linea rounded-2xl border border-linea bg-papel px-3">
              {lista.map((p) => (
                <Fila key={p.id} p={p} detalle={p.ultimoUso ? `Usada ${haceCuanto(p.ultimoUso)}` : undefined}>
                  <button type="button" onClick={() => ejecutar(e.id, [p.id])} className={botonChico}>
                    {a.una}
                  </button>
                </Fila>
              ))}
            </ul>
          </section>
        )
      })}

      {candidatas.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">¿Todavía la usas?</h2>
          <p className="mb-1 text-sm text-suave">Llevan más de 4 meses sin usarse. Si ya no te gustan, márcalas para donar.</p>
          <ul className="divide-y divide-linea rounded-2xl border border-linea bg-papel px-3">
            {candidatas.map((p) => (
              <Fila key={p.id} p={p} detalle={p.ultimoUso ? `Usada ${haceCuanto(p.ultimoUso)}` : 'Nunca usada'}>
                <button type="button" onClick={() => cambiarEstado([p.id], 'donar')} className={botonChico} aria-label={`Marcar ${nombreDe(p)} para donar`}>
                  {estadoDe('donar').emoji} Donar
                </button>
              </Fila>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
