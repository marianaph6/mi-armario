import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { Colores } from '../components/Colores'
import { useObjectUrl } from '../lib/useObjectUrl'
import { db, type Categoria, type Clima, type Estado, type Ocasion } from '../db/schema'
import { eliminarPrenda } from '../db/acciones'
import { prepararFoto } from '../lib/imagen'
import { CATEGORIAS, CLIMAS, COLORES, ESTADOS, OCASIONES } from '../logic/catalogo'

function Campo({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">
        {titulo}
        {ayuda && <span className="ml-2 font-normal tracking-normal normal-case">{ayuda}</span>}
      </h2>
      {children}
    </section>
  )
}

const alternar = <T,>(lista: T[], x: T) => (lista.includes(x) ? lista.filter((y) => y !== x) : [...lista, x])

export function PrendaForm() {
  const { id } = useParams()
  const editId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const inputFoto = useRef<HTMLInputElement>(null)

  const [cargando, setCargando] = useState(editId !== undefined)
  const [fotos, setFotos] = useState<{ foto: Blob; miniatura: Blob } | null>(null)
  /** al editar, la foto solo se guarda (y se vuelve a subir a la nube) si se eligió otra */
  const [fotoNueva, setFotoNueva] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string>()
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [subtipo, setSubtipo] = useState<string>()
  const [colores, setColores] = useState<string[]>([])
  const [ocasiones, setOcasiones] = useState<Ocasion[]>([])
  const [clima, setClima] = useState<Clima>('todo')
  const [estado, setEstado] = useState<Estado>('limpia')
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [aviso, setAviso] = useState<string>()

  const vista = useObjectUrl(fotos?.foto)

  useEffect(() => {
    if (editId === undefined) return
    let vigente = true
    db.prendas.get(editId).then((p) => {
      if (!vigente) return
      if (!p) return navigate('/closet', { replace: true })
      if (p.foto && p.miniatura) setFotos({ foto: p.foto, miniatura: p.miniatura })
      setCategoria(p.categoria)
      setSubtipo(p.subtipo)
      setColores(p.colores)
      setOcasiones(p.ocasiones)
      setClima(p.clima)
      setEstado(p.estado)
      setNombre(p.nombre ?? '')
      setNotas(p.notas ?? '')
      setCargando(false)
    })
    return () => {
      vigente = false
    }
  }, [editId, navigate])

  async function elegirFoto(archivo?: File) {
    if (!archivo) return
    setProcesando(true)
    setError(undefined)
    try {
      setFotos(await prepararFoto(archivo))
      setFotoNueva(true)
    } catch {
      setError('No se pudo leer esa foto. Intenta con otra.')
    } finally {
      setProcesando(false)
      if (inputFoto.current) inputFoto.current.value = ''
    }
  }

  const falta = !fotos ? 'Agrega una foto' : !categoria ? 'Elige el tipo de prenda' : ocasiones.length === 0 ? 'Elige al menos una ocasión' : null

  async function guardar(yOtra: boolean) {
    if (!fotos || !categoria || falta) return
    const datos = {
      ...(fotoNueva || editId === undefined ? fotos : {}),
      categoria,
      subtipo,
      colores,
      ocasiones,
      clima,
      estado,
      nombre: nombre.trim() || undefined,
      notas: notas.trim() || undefined,
    }
    try {
      if (editId !== undefined) await db.prendas.update(editId, datos)
      else await db.prendas.add({ ...datos, usos: 0, creada: new Date() })
    } catch {
      setError('No se pudo guardar. Revisa el espacio libre del celular.')
      return
    }
    if (yOtra) {
      // se conservan tipo y ocasiones para registrar varias prendas parecidas seguidas
      setFotos(null)
      setColores([])
      setNombre('')
      setNotas('')
      setAviso('Prenda guardada ✓')
      setTimeout(() => setAviso(undefined), 2000)
      window.scrollTo({ top: 0 })
    } else {
      navigate('/closet')
    }
  }

  async function eliminar() {
    if (editId === undefined || !confirm('¿Eliminar esta prenda? También se quitará de tus outfits.')) return
    await eliminarPrenda(editId)
    navigate('/closet')
  }

  if (cargando) return null

  const subtipos = CATEGORIAS.find((c) => c.id === categoria)?.subtipos ?? []

  return (
    <div className="mx-auto min-h-full max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
      <header className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => navigate('/closet')} className="-ml-2 px-2 py-2 text-acento">
          ‹ Clóset
        </button>
        <h1 className="text-lg font-semibold">{editId !== undefined ? 'Editar prenda' : 'Nueva prenda'}</h1>
        {editId !== undefined ? (
          <button type="button" onClick={eliminar} className="-mr-2 px-2 py-2 text-red-700">
            Eliminar
          </button>
        ) : (
          <span className="w-16" />
        )}
      </header>

      <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={(e) => elegirFoto(e.target.files?.[0])} />

      <div className="space-y-6">
        <button
          type="button"
          onClick={() => inputFoto.current?.click()}
          className="relative mx-auto flex aspect-[3/4] w-3/5 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-linea bg-papel"
        >
          {vista ? (
            <>
              <img src={vista} alt="Foto de la prenda" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 rounded-full bg-tinta/70 px-3 py-1 text-xs font-medium text-white">Cambiar foto</span>
            </>
          ) : (
            <span className="px-4 text-center text-suave">
              <span className="mb-2 block text-4xl">📷</span>
              {procesando ? 'Preparando foto…' : 'Toca para tomar o elegir una foto'}
            </span>
          )}
          {procesando && vista && <span className="absolute inset-0 flex items-center justify-center bg-papel/70 text-sm">Preparando foto…</span>}
        </button>

        <Campo titulo="Tipo">
          <Chips
            opciones={CATEGORIAS}
            seleccion={categoria ? [categoria] : []}
            onToggle={(c) => {
              setCategoria(c)
              if (c !== categoria) setSubtipo(undefined)
            }}
          />
          {subtipos.length > 0 && (
            <div className="mt-3">
              <Chips
                opciones={subtipos.map((s) => ({ id: s, label: s }))}
                seleccion={subtipo ? [subtipo] : []}
                onToggle={(s) => setSubtipo(subtipo === s ? undefined : s)}
                tamano="sm"
              />
            </div>
          )}
        </Campo>

        <Campo titulo="Para" ayuda="puedes elegir varias">
          <Chips opciones={OCASIONES} seleccion={ocasiones} onToggle={(o) => setOcasiones(alternar(ocasiones, o))} />
        </Campo>

        <Campo titulo="Color" ayuda="opcional, uno o dos">
          <Colores seleccion={colores} onToggle={(c) => setColores(alternar(colores, c))} />
          {colores.length > 0 && (
            <p className="mt-2 text-sm text-suave">{colores.map((c) => COLORES.find((x) => x.id === c)?.label).join(' · ')}</p>
          )}
        </Campo>

        <Campo titulo="Clima">
          <Chips opciones={CLIMAS} seleccion={[clima]} onToggle={setClima} tamano="sm" />
        </Campo>

        {editId !== undefined && (
          <Campo titulo="Estado" ayuda="solo las disponibles salen en las sugerencias">
            <Chips
              opciones={ESTADOS}
              seleccion={[estado]}
              onToggle={setEstado}
              tamano="sm"
            />
          </Campo>
        )}

        <Campo titulo="Nombre y notas" ayuda="opcional">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Leggings negros de tiro alto"
            className="w-full rounded-xl border border-linea bg-papel px-4 py-3 outline-none focus:border-tinta"
          />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas: marca, talla, con qué combina…"
            rows={2}
            className="mt-2 w-full rounded-xl border border-linea bg-papel px-4 py-3 outline-none focus:border-tinta"
          />
        </Campo>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-crema/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
        <div className="mx-auto max-w-lg">
          {(error || aviso || falta) && (
            <p className={`mb-2 text-center text-sm ${error ? 'text-red-700' : aviso ? 'text-green-700' : 'text-suave'}`}>
              {error ?? aviso ?? falta}
            </p>
          )}
          <div className="flex gap-2">
            {editId === undefined && (
              <button
                type="button"
                disabled={!!falta || procesando}
                onClick={() => guardar(true)}
                className="flex-1 rounded-full border border-tinta px-4 py-3.5 font-semibold disabled:opacity-40"
              >
                Guardar y otra
              </button>
            )}
            <button
              type="button"
              disabled={!!falta || procesando}
              onClick={() => guardar(false)}
              className="flex-1 rounded-full bg-acento px-4 py-3.5 font-semibold text-white active:bg-acento-osc disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
