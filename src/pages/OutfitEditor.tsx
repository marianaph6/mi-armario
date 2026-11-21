import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { FotoPrenda } from '../components/FotoPrenda'
import { SelectorPrendas } from '../components/SelectorPrendas'
import { db, type Ocasion } from '../db/schema'
import { prendasDe } from '../lib/usePrendas'
import { OCASIONES, categoriaDe, ocasionDe } from '../logic/catalogo'

const esOcasion = (x: string | null): x is Ocasion => OCASIONES.some((o) => o.id === x)

export function OutfitEditor() {
  const { id } = useParams()
  const editId = id && id !== 'nuevo' ? Number(id) : undefined
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const volver = () => navigate(params.get('desde') === 'hoy' ? `/hoy?ocasion=${ocasion ?? ''}` : '/outfits')

  const prendas = useLiveQuery(() => db.prendas.orderBy('creada').reverse().toArray(), [])
  const [cargando, setCargando] = useState(editId !== undefined)
  const inicial = params.get('ocasion')
  const [ocasion, setOcasion] = useState<Ocasion | null>(esOcasion(inicial) ? inicial : null)
  const [seleccion, setSeleccion] = useState<number[]>([])
  const [nombre, setNombre] = useState('')
  const [favorito, setFavorito] = useState(false)
  const [verTodo, setVerTodo] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (editId === undefined) return
    let vigente = true
    db.outfits.get(editId).then((o) => {
      if (!vigente) return
      if (!o) return navigate('/outfits', { replace: true })
      setOcasion(o.ocasion)
      setSeleccion(o.prendaIds)
      setNombre(o.nombre ?? '')
      setFavorito(o.favorito)
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [editId, navigate])

  if (cargando || !prendas) return null

  const porId = new Map(prendas.map((p) => [p.id, p]))
  const elegidas = prendasDe(seleccion, porId)
  // siempre se muestran las ya elegidas, aunque no sean de la ocasión
  const candidatas = prendas.filter((p) => verTodo || !ocasion || p.ocasiones.includes(ocasion) || seleccion.includes(p.id))
  const ocultas = prendas.length - candidatas.length

  const falta = !ocasion ? 'Elige para qué ocasión es' : elegidas.length < 2 ? 'Elige al menos dos prendas' : null

  async function guardar() {
    if (!ocasion || falta) return
    const datos = { ocasion, prendaIds: elegidas.map((p) => p.id), nombre: nombre.trim() || undefined, favorito }
    try {
      if (editId !== undefined) await db.outfits.update(editId, datos)
      else await db.outfits.add({ ...datos, usos: 0, creado: new Date() })
      volver()
    } catch {
      setError('No se pudo guardar el outfit.')
    }
  }

  async function eliminar() {
    if (editId === undefined || !confirm('¿Eliminar este outfit? Tus prendas no se borran.')) return
    await db.outfits.delete(editId)
    navigate('/outfits')
  }

  const alternar = (pid: number) => setSeleccion((s) => (s.includes(pid) ? s.filter((x) => x !== pid) : [...s, pid]))

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
      <header className="mb-4 flex items-center justify-between">
        <button type="button" onClick={volver} className="-ml-2 px-2 py-2 text-acento">
          ‹ Volver
        </button>
        <h1 className="text-lg font-semibold">{editId !== undefined ? 'Editar outfit' : 'Nuevo outfit'}</h1>
        {editId !== undefined ? (
          <button type="button" onClick={eliminar} className="-mr-2 px-2 py-2 text-red-700">
            Eliminar
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      <div className="space-y-5">
        <Chips opciones={OCASIONES} seleccion={ocasion ? [ocasion] : []} onToggle={setOcasion} />

        <section className="rounded-2xl border border-linea bg-papel p-3">
          {elegidas.length === 0 ? (
            <p className="py-6 text-center text-sm text-suave">Toca las prendas de abajo para armar el outfit.</p>
          ) : (
            <ul className="sin-barra flex gap-2 overflow-x-auto">
              {elegidas.map((p) => (
                <li key={p.id} className="relative shrink-0">
                  <FotoPrenda blob={p.miniatura} alt={p.nombre || categoriaDe(p.categoria).label} className="h-28 w-21 rounded-lg" />
                  <button
                    type="button"
                    aria-label="Quitar del outfit"
                    onClick={() => alternar(p.id)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-tinta/75 text-sm leading-none text-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (opcional)"
              className="min-w-0 flex-1 rounded-xl border border-linea bg-crema px-3 py-2.5 outline-none focus:border-tinta"
            />
            <button
              type="button"
              aria-pressed={favorito}
              onClick={() => setFavorito(!favorito)}
              className={`shrink-0 rounded-xl border px-3 text-sm font-medium ${favorito ? 'border-tinta bg-tinta text-white' : 'border-linea bg-crema'}`}
            >
              ⭐ Favorito
            </button>
          </div>
        </section>

        {prendas.length === 0 && <p className="text-center text-suave">Tu clóset está vacío. Agrega prendas primero.</p>}

        <SelectorPrendas prendas={candidatas} seleccion={seleccion} alternar={alternar} />

        {ocasion && (ocultas > 0 || verTodo) && (
          <button type="button" onClick={() => setVerTodo(!verTodo)} className="w-full py-2 text-sm font-medium text-acento">
            {verTodo ? `Ver solo prendas de ${ocasionDe(ocasion).label.toLowerCase()}` : `Ver todo el clóset (${ocultas} más)`}
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-crema/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
        <div className="mx-auto max-w-lg">
          {(error || falta) && <p className={`mb-2 text-center text-sm ${error ? 'text-red-700' : 'text-suave'}`}>{error ?? falta}</p>}
          <button
            type="button"
            disabled={!!falta}
            onClick={guardar}
            className="w-full rounded-full bg-acento px-4 py-3.5 font-semibold text-white active:bg-acento-osc disabled:opacity-40"
          >
            Guardar outfit
          </button>
        </div>
      </div>
    </div>
  )
}
