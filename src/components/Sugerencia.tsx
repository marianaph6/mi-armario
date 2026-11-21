import { useState } from 'react'
import { Link } from 'react-router-dom'
import { registrarUso } from '../db/acciones'
import { db, type Categoria, type Ocasion, type Outfit, type Prenda, type RegistroUso } from '../db/schema'
import { prendasDe } from '../lib/usePrendas'
import { categoriaDe, ocasionDe } from '../logic/catalogo'
import { clave, queFalta, sugerir } from '../logic/sugerir'
import { FotoPrenda } from './FotoPrenda'

interface Props {
  ocasion: Ocasion
  porId: Map<number, Prenda>
  outfits: Outfit[]
  usos: RegistroUso[]
}

const OPCIONALES: Categoria[] = ['calzado', 'abrigo', 'accesorio']
const nombreDe = (p: Prenda) => p.nombre || p.subtipo || categoriaDe(p.categoria).label

/** Outfit sugerido para la ocasión. Se monta con `key={ocasion}` para empezar de cero al cambiar de ocasión. */
export function Sugerencia({ ocasion, porId, outfits, usos }: Props) {
  const generar = () => sugerir({ prendas: [...porId.values()], outfits, usos, ocasion })
  const [lista, setLista] = useState(generar)
  const [indice, setIndice] = useState(0)
  const [piezas, setPiezas] = useState<number[]>(() => lista[0]?.prendaIds ?? [])
  const [registrado, setRegistrado] = useState(false)
  const [cambiando, setCambiando] = useState<{ categoria: Categoria; actual?: number } | null>(null)

  const etiqueta = ocasionDe(ocasion).label.toLowerCase()
  const actuales = prendasDe(piezas, porId)
  const guardado = outfits.find((o) => o.ocasion === ocasion && clave(o.prendaIds) === clave(piezas))

  function mostrar(nueva: typeof lista, i: number) {
    setLista(nueva)
    setIndice(i)
    setPiezas(nueva[i]?.prendaIds ?? [])
    setRegistrado(false)
  }
  // al terminar la lista (o después de registrar) se calcula de nuevo con los datos al día
  const otra = () => (registrado || indice + 1 >= lista.length ? mostrar(generar(), 0) : mostrar(lista, indice + 1))

  async function meLoPongo() {
    await registrarUso({ ocasion, prendaIds: piezas, outfitId: guardado?.id })
    setRegistrado(true)
  }

  const guardar = () => db.outfits.add({ ocasion, prendaIds: piezas, favorito: false, usos: 0, creado: new Date() })

  if (actuales.length === 0) {
    const faltan = queFalta([...porId.values()], ocasion).map((c) => categoriaDe(c).label.toLowerCase())
    return (
      <div className="rounded-2xl bg-acento-claro p-4 text-center">
        <p className="font-semibold">No pude armar un outfit de {etiqueta}</p>
        <p className="mt-1 text-sm">
          {faltan.length > 0
            ? `Te falta ropa limpia marcada para ${etiqueta}: ${faltan.join(' e ')}.`
            : 'Ya te mostré todas las combinaciones posibles.'}
        </p>
        <Link to="/closet/nueva" className="mt-3 inline-block rounded-full bg-acento px-5 py-2.5 text-sm font-semibold text-white">
          Agregar prenda
        </Link>
      </div>
    )
  }

  const enUso = new Set(piezas)
  const candidatas = (categoria: Categoria) => {
    const limpias = [...porId.values()].filter((p) => p.categoria === categoria && p.estado === 'limpia' && !enUso.has(p.id))
    const deOcasion = limpias.filter((p) => p.ocasiones.includes(ocasion))
    return (deOcasion.length ? deOcasion : limpias).sort((a, b) => (a.ultimoUso?.getTime() ?? 0) - (b.ultimoUso?.getTime() ?? 0))
  }
  const agregables = OPCIONALES.filter((c) => !actuales.some((p) => p.categoria === c) && candidatas(c).length > 0)

  function elegir(nueva?: Prenda) {
    if (!cambiando) return
    setPiezas((ids) => [...ids.filter((id) => id !== cambiando.actual), ...(nueva ? [nueva.id] : [])])
    setCambiando(null)
  }

  return (
    <div className="rounded-2xl border border-linea bg-papel p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-suave uppercase">Sugerencia</h2>
        <p className="text-xs text-suave">{guardado ? `${guardado.favorito ? '⭐ ' : ''}Outfit guardado` : 'Toca una prenda para cambiarla'}</p>
      </div>

      <ul className="flex gap-2">
        {actuales.map((p) => (
          <li key={p.id} className="min-w-0 flex-1">
            <button type="button" disabled={registrado} onClick={() => setCambiando({ categoria: p.categoria, actual: p.id })} className="block w-full text-left">
              <FotoPrenda blob={p.miniatura} alt={nombreDe(p)} className="aspect-[3/4] rounded-xl" />
              <span className="mt-1 block truncate text-xs text-suave">{nombreDe(p)}</span>
            </button>
          </li>
        ))}
      </ul>

      {!registrado && agregables.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {agregables.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCambiando({ categoria: c })}
              className="rounded-full border border-dashed border-suave/60 px-3 py-1 text-xs font-medium text-suave"
            >
              + {categoriaDe(c).label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={otra} className="flex-1 rounded-full border border-tinta py-3 text-sm font-semibold">
          {registrado ? 'Sugerir otro' : 'Otra opción'}
        </button>
        <button
          type="button"
          onClick={meLoPongo}
          disabled={registrado}
          className="flex-[1.4] rounded-full bg-acento py-3 text-sm font-semibold text-white active:bg-acento-osc disabled:bg-linea disabled:text-suave"
        >
          {registrado ? 'Registrado ✓' : 'Me lo pongo'}
        </button>
      </div>

      {!guardado && actuales.length >= 2 && (
        <button type="button" onClick={guardar} className="mt-2 w-full py-1.5 text-sm font-medium text-acento">
          Guardar como outfit
        </button>
      )}

      {cambiando && (
        <div className="fixed inset-0 z-30 flex items-end bg-tinta/40" onClick={() => setCambiando(null)}>
          <div
            role="dialog"
            aria-label={`Elegir ${categoriaDe(cambiando.categoria).label.toLowerCase()}`}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-h-[75%] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-crema px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {categoriaDe(cambiando.categoria).emoji} {cambiando.actual ? 'Cambiar' : 'Agregar'} {categoriaDe(cambiando.categoria).label.toLowerCase()}
              </h3>
              <button type="button" onClick={() => setCambiando(null)} className="px-2 py-1 text-acento">
                Cerrar
              </button>
            </div>
            {candidatas(cambiando.categoria).length === 0 ? (
              <p className="py-6 text-center text-suave">No tienes otra prenda limpia de este tipo.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2">
                {candidatas(cambiando.categoria).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => elegir(p)} className="block w-full">
                      <FotoPrenda blob={p.miniatura} alt={nombreDe(p)} className="aspect-[3/4] rounded-xl" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {cambiando.actual !== undefined && OPCIONALES.includes(cambiando.categoria) && (
              <button type="button" onClick={() => elegir()} className="mt-3 w-full rounded-full border border-tinta py-2.5 text-sm font-semibold">
                Quitar del outfit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
