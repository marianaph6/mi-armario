import { useLiveQuery } from 'dexie-react-hooks'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FotoPrenda } from '../components/FotoPrenda'
import { db, type Prenda } from '../db/schema'
import { haceCuanto } from '../lib/fechas'
import { CATEGORIAS, OCASIONES, categoriaDe } from '../logic/catalogo'

const DIAS_OLVIDO = 30

function Grupo({ titulo, ayuda, prendas, pie }: { titulo: string; ayuda: string; prendas: Prenda[]; pie?: (p: Prenda) => ReactNode }) {
  if (prendas.length === 0) return null
  return (
    <section>
      <h2 className="font-semibold">
        {titulo} <span className="font-normal text-suave">· {prendas.length}</span>
      </h2>
      <p className="text-sm text-suave">{ayuda}</p>
      <ul className="sin-barra -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
        {prendas.slice(0, 20).map((p) => (
          <li key={p.id} className="w-21 shrink-0">
            <Link to={`/closet/${p.id}`}>
              <FotoPrenda blob={p.miniatura} alt={p.nombre || p.subtipo || categoriaDe(p.categoria).label} className="h-28 w-21 rounded-xl" />
              {pie && <span className="mt-1 block truncate text-center text-xs text-suave">{pie(p)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Barras({ filas }: { filas: { label: string; n: number }[] }) {
  const max = Math.max(1, ...filas.map((f) => f.n))
  return (
    <ul className="space-y-1.5">
      {filas.map((f) => (
        <li key={f.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate">{f.label}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-linea">
            <span className="block h-full rounded-full bg-acento" style={{ width: `${(f.n / max) * 100}%` }} />
          </span>
          <span className="w-7 shrink-0 text-right text-suave tabular-nums">{f.n}</span>
        </li>
      ))}
    </ul>
  )
}

export function Stats() {
  const prendas = useLiveQuery(() => db.prendas.toArray(), [])
  const totalOutfits = useLiveQuery(() => db.outfits.count(), [])
  const usos = useLiveQuery(() => db.usos.toArray(), [])

  if (!prendas || !usos) return null

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const limiteOlvido = ahora.getTime() - DIAS_OLVIDO * 86_400_000

  const usadasMes = prendas.filter((p) => p.ultimoUso && p.ultimoUso >= inicioMes).length
  const rotacion = prendas.length ? Math.round((usadasMes / prendas.length) * 100) : 0
  const sinEstrenar = prendas.filter((p) => p.usos === 0)
  const olvidadas = prendas
    .filter((p) => p.ultimoUso && p.ultimoUso.getTime() < limiteOlvido)
    .sort((a, b) => a.ultimoUso!.getTime() - b.ultimoUso!.getTime())
  const masUsadas = prendas.filter((p) => p.usos > 0).sort((a, b) => b.usos - a.usos).slice(0, 10)
  const mes = ahora.toLocaleDateString('es', { month: 'long' })

  return (
    <>
      <Link to="/mas" className="-ml-1 text-acento">
        ‹ Más
      </Link>
      <h1 className="mt-1 mb-4 text-3xl font-bold tracking-tight">Estadísticas</h1>

      {prendas.length === 0 ? (
        <p className="mt-16 text-center text-suave">Agrega prendas a tu clóset para ver tus estadísticas.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { n: prendas.length, label: 'prendas' },
              { n: totalOutfits ?? 0, label: 'outfits' },
              { n: usos.length, label: 'usos registrados' },
            ].map((x) => (
              <div key={x.label} className="rounded-2xl border border-linea bg-papel px-2 py-3">
                <p className="text-2xl font-bold tabular-nums">{x.n}</p>
                <p className="text-xs text-suave">{x.label}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-linea bg-papel p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Rotación de {mes}</h2>
              <p className="text-2xl font-bold tabular-nums">{rotacion}%</p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-linea">
              <div className="h-full rounded-full bg-acento" style={{ width: `${rotacion}%` }} />
            </div>
            <p className="mt-2 text-sm text-suave">
              Este mes usaste {usadasMes} de tus {prendas.length} prendas.
            </p>
          </section>

          <Grupo titulo="Sin estrenar" ayuda="Nunca las has registrado en un outfit." prendas={sinEstrenar} />
          <Grupo
            titulo="Olvidadas"
            ayuda={`Llevan más de ${DIAS_OLVIDO} días sin usarse.`}
            prendas={olvidadas}
            pie={(p) => haceCuanto(p.ultimoUso)}
          />
          <Grupo titulo="Las que más usas" ayuda="Tus prendas más repetidas." prendas={masUsadas} pie={(p) => `${p.usos} ${p.usos === 1 ? 'vez' : 'veces'}`} />

          <section className="rounded-2xl border border-linea bg-papel p-4">
            <h2 className="mb-3 font-semibold">Tu clóset por tipo</h2>
            <Barras filas={CATEGORIAS.map((c) => ({ label: `${c.emoji} ${c.label}`, n: prendas.filter((p) => p.categoria === c.id).length }))} />
          </section>

          <section className="rounded-2xl border border-linea bg-papel p-4">
            <h2 className="mb-3 font-semibold">Usos por ocasión</h2>
            <Barras filas={OCASIONES.map((o) => ({ label: `${o.emoji} ${o.label}`, n: usos.filter((u) => u.ocasion === o.id).length }))} />
          </section>
        </div>
      )}
    </>
  )
}
