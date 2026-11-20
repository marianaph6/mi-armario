import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { Collage } from '../components/Collage'
import { SelectorPrendas } from '../components/SelectorPrendas'
import { registrarUso } from '../db/acciones'
import { db, type Ocasion } from '../db/schema'
import { inicioDeHoy } from '../lib/fechas'
import { prendasDe } from '../lib/usePrendas'
import { OCASIONES } from '../logic/catalogo'

/** 'AAAA-MM-DD' en hora local, el formato de <input type="date">. */
const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mismas = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x))

export function RegistroPasado() {
  const navigate = useNavigate()
  const volver = () => navigate('/mas/historial')
  const prendas = useLiveQuery(() => db.prendas.orderBy('creada').reverse().toArray(), [])
  const outfits = useLiveQuery(() => db.outfits.toArray(), [])

  const hoy = aTexto(new Date())
  const [dia, setDia] = useState(aTexto(new Date(inicioDeHoy().getTime() - 86_400_000)))
  const [ocasion, setOcasion] = useState<Ocasion | null>(null)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [outfitId, setOutfitId] = useState<number>()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string>()

  if (!prendas || !outfits) return null

  const porId = new Map(prendas.map((p) => [p.id, p]))
  const guardados = outfits.filter((o) => o.ocasion === ocasion)
  const falta = !dia || dia > hoy ? 'Elige un día que ya pasó' : !ocasion ? 'Elige la ocasión' : seleccion.length === 0 ? 'Elige qué te pusiste' : null

  const alternar = (pid: number) => {
    const nueva = seleccion.includes(pid) ? seleccion.filter((x) => x !== pid) : [...seleccion, pid]
    setSeleccion(nueva)
    // sigue contando como el outfit guardado solo si quedan exactamente sus prendas
    if (outfitId !== undefined && !mismas(nueva, outfits.find((o) => o.id === outfitId)?.prendaIds ?? [])) setOutfitId(undefined)
  }

  async function guardar() {
    if (falta || !ocasion) return
    setGuardando(true)
    const [a, m, d] = dia.split('-').map(Number)
    try {
      // a mediodía para que el día no cambie por la zona horaria; si es hoy, la hora actual
      await registrarUso({ ocasion, prendaIds: seleccion, outfitId, fecha: dia === hoy ? undefined : new Date(a, m - 1, d, 12) })
      volver()
    } catch {
      setError('No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
      <header className="mb-4 flex items-center justify-between">
        <button type="button" onClick={volver} className="-ml-2 px-2 py-2 text-acento">
          ‹ Volver
        </button>
        <h1 className="text-lg font-semibold">Registrar un día pasado</h1>
        <span className="w-16" />
      </header>

      <div className="space-y-5">
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-linea bg-papel p-3">
          <span className="font-medium">¿Qué día?</span>
          <input
            type="date"
            value={dia}
            max={hoy}
            onChange={(e) => setDia(e.target.value)}
            className="rounded-xl border border-linea bg-crema px-3 py-2 outline-none focus:border-tinta"
          />
        </label>

        <Chips
          opciones={OCASIONES}
          seleccion={ocasion ? [ocasion] : []}
          onToggle={(o) => {
            setOcasion(o)
            setOutfitId(undefined)
          }}
        />

        {guardados.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">¿Fue uno de tus outfits?</h2>
            <ul className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4">
              {guardados.map((o) => (
                <li key={o.id} className="w-24 shrink-0">
                  <button
                    type="button"
                    aria-pressed={outfitId === o.id}
                    onClick={() => {
                      setSeleccion(o.prendaIds)
                      setOutfitId(o.id)
                    }}
                    className={`block w-full rounded-xl ${outfitId === o.id ? 'ring-2 ring-acento ring-offset-2 ring-offset-crema' : ''}`}
                  >
                    <Collage prendas={prendasDe(o.prendaIds, porId)} />
                  </button>
                  <p className="mt-1 truncate text-center text-xs text-suave">{o.nombre || `#${o.id}`}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {prendas.length === 0 ? (
          <p className="text-center text-suave">Tu clóset está vacío. Agrega prendas primero.</p>
        ) : (
          <>
            <p className="text-sm text-suave">{seleccion.length === 0 ? 'Toca las prendas que usaste:' : `${seleccion.length} prendas elegidas`}</p>
            <SelectorPrendas prendas={prendas} seleccion={seleccion} alternar={alternar} />
          </>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-crema/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
        <div className="mx-auto max-w-lg">
          {(error || falta) && <p className={`mb-2 text-center text-sm ${error ? 'text-red-700' : 'text-suave'}`}>{error ?? falta}</p>}
          <button
            type="button"
            disabled={!!falta || guardando}
            onClick={guardar}
            className="w-full rounded-full bg-acento px-4 py-3.5 font-semibold text-white active:bg-acento-osc disabled:opacity-40"
          >
            Guardar en el historial
          </button>
        </div>
      </div>
    </div>
  )
}
