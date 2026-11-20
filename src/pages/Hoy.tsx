import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Collage } from '../components/Collage'
import { FotoPrenda } from '../components/FotoPrenda'
import { Sugerencia } from '../components/Sugerencia'
import { deshacerUso, registrarUso } from '../db/acciones'
import { db, type Ocasion, type Outfit } from '../db/schema'
import { DIAS_AVISO, diasSinRespaldo } from '../logic/backup'
import { haceCuanto, hora, inicioDeHoy } from '../lib/fechas'
import { prendasDe, usePrendasPorId } from '../lib/usePrendas'
import { OCASIONES, categoriaDe } from '../logic/catalogo'

const ocasionDe = (id: Ocasion) => OCASIONES.find((o) => o.id === id)!

export function Hoy() {
  const [params, setParams] = useSearchParams()
  const param = params.get('ocasion')
  const ocasion = OCASIONES.find((o) => o.id === param)?.id

  const porId = usePrendasPorId()
  const todos = useLiveQuery(() => db.outfits.toArray(), [])
  const usosRecientes = useLiveQuery(() => db.usos.where('fecha').aboveOrEqual(new Date(inicioDeHoy().getTime() - 8 * 86_400_000)).toArray(), [])
  const outfits = todos?.filter((o) => o.ocasion === ocasion)
  const usosHoy = usosRecientes?.filter((u) => u.fecha >= inicioDeHoy()).sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
  const sinRespaldo = useLiveQuery(diasSinRespaldo, []) ?? 0
  const [recien, setRecien] = useState<number>()

  const fecha = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

  // primero lo que lleva más tiempo sin usarse; al final lo que tiene prendas para lavar
  const tieneSucias = (o: Outfit) => o.prendaIds.some((id) => porId?.get(id)?.estado === 'lavar')
  const ordenados = [...(outfits ?? [])].sort(
    (a, b) => Number(tieneSucias(a)) - Number(tieneSucias(b)) || (a.ultimoUso?.getTime() ?? 0) - (b.ultimoUso?.getTime() ?? 0),
  )

  async function meLoPongo(o: Outfit) {
    await registrarUso({ ocasion: o.ocasion, prendaIds: o.prendaIds, outfitId: o.id })
    setRecien(o.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-suave first-letter:uppercase">{fecha}</p>
        <h1 className="text-3xl font-bold tracking-tight">¿Qué me pongo?</h1>
      </header>

      {sinRespaldo > DIAS_AVISO && (
        <Link to="/mas" className="mb-5 flex items-center gap-3 rounded-2xl bg-acento-claro p-3 text-sm">
          <span className="text-2xl">💾</span>
          <span className="flex-1">
            <span className="block font-semibold">Haz una copia de seguridad</span>
            Llevas {sinRespaldo} días sin guardar una copia de tu clóset.
          </span>
          <span className="text-xl text-suave">›</span>
        </Link>
      )}

      {porId && usosHoy && usosHoy.length > 0 && (
        <section className="mb-5 rounded-2xl border border-linea bg-papel p-3">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">Hoy te pusiste</h2>
          <ul className="space-y-3">
            {usosHoy.map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <ul className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
                  {prendasDe(u.prendaIds, porId).map((p) => (
                    <li key={p.id} className="shrink-0">
                      <FotoPrenda blob={p.miniatura} alt={p.nombre || categoriaDe(p.categoria).label} className="h-14 w-11 rounded-md" />
                    </li>
                  ))}
                </ul>
                <div className="shrink-0 text-right text-xs text-suave">
                  <p className="font-medium text-tinta">
                    {ocasionDe(u.ocasion).emoji} {ocasionDe(u.ocasion).label}
                  </p>
                  <p>{hora(u.fecha)}</p>
                  <button type="button" onClick={() => {
                      setRecien(undefined)
                      deshacerUso(u.id)
                    }} className="py-1 text-acento">
                    Deshacer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-4 gap-2">
        {OCASIONES.map((o) => {
          const activo = o.id === ocasion
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={activo}
              onClick={() => {
                setRecien(undefined)
                setParams(activo ? {} : { ocasion: o.id }, { replace: true })
              }}
              className={`rounded-2xl border py-3 text-center transition-colors ${
                activo ? 'border-tinta bg-tinta text-white' : 'border-linea bg-papel active:bg-linea'
              }`}
            >
              <div className="text-2xl">{o.emoji}</div>
              <div className="mt-1 text-[13px] font-semibold">{o.label}</div>
            </button>
          )
        })}
      </div>

      {!ocasion && (
        <>
          <p className="mt-10 text-center text-suave">Elige para qué te vas a vestir.</p>
          <Link to="/historial/nuevo" className="mt-6 block py-2 text-center text-sm font-medium text-acento">
            ¿Olvidaste registrar otro día? Agrégalo
          </Link>
        </>
      )}

      {ocasion && porId && todos && outfits && usosRecientes && (
        <section className="mt-5">
          <Sugerencia key={ocasion} ocasion={ocasion} porId={porId} outfits={todos} usos={usosRecientes} />

          {ordenados.length > 0 && (
            <>
              <h2 className="mt-7 mb-2 text-sm font-semibold tracking-wide text-suave uppercase">Tus outfits guardados</h2>
              <ul className="space-y-3">
                {ordenados.map((o) => {
                  const prendas = prendasDe(o.prendaIds, porId)
                  const sucias = prendas.filter((p) => p.estado === 'lavar').length
                  return (
                    <li key={o.id} className="flex gap-3 rounded-2xl border border-linea bg-papel p-3">
                      <Link to={`/outfits/${o.id}?desde=hoy`} className="w-28 shrink-0">
                        <Collage prendas={prendas} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate font-semibold">
                          {o.favorito && '⭐ '}
                          {o.nombre || `${ocasionDe(o.ocasion).label} #${o.id}`}
                        </p>
                        <p className="text-sm text-suave first-letter:uppercase">
                          {o.ultimoUso ? `Usado ${haceCuanto(o.ultimoUso)}` : 'Sin estrenar'}
                        </p>
                        {sucias > 0 && (
                          <p className="mt-0.5 text-sm text-acento-osc">
                            🧺 {sucias === 1 ? '1 prenda para lavar' : `${sucias} prendas para lavar`}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => meLoPongo(o)}
                          disabled={recien === o.id}
                          className="mt-auto rounded-full bg-acento py-2.5 text-sm font-semibold text-white active:bg-acento-osc disabled:bg-linea disabled:text-suave"
                        >
                          {recien === o.id ? 'Registrado ✓' : 'Me lo pongo'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <Link to={`/outfits/nuevo?ocasion=${ocasion}&desde=hoy`} className="mt-4 block py-2 text-center text-sm font-medium text-acento">
            + Armar un outfit de {ocasionDe(ocasion).label.toLowerCase()}
          </Link>
        </section>
      )}
    </>
  )
}
