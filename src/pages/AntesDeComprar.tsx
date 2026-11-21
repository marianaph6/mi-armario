import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Chips } from '../components/Chips'
import { Colores } from '../components/Colores'
import { FotoPrenda } from '../components/FotoPrenda'
import { db, type Categoria, type Ocasion, type Prenda } from '../db/schema'
import { CATEGORIAS, OCASIONES, categoriaDe, colorDe, ocasionDe } from '../logic/catalogo'
import { combinables, parecidas, parejaDe } from '../logic/comprar'

function Fila({ prendas }: { prendas: Prenda[] }) {
  return (
    <ul className="sin-barra -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
      {prendas.map((p) => (
        <li key={p.id} className="shrink-0">
          <Link to={`/closet/${p.id}`}>
            <FotoPrenda blob={p.miniatura} alt={p.nombre || p.subtipo || categoriaDe(p.categoria).label} className="h-28 w-21 rounded-xl" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function AntesDeComprar() {
  const navigate = useNavigate()
  const prendas = useLiveQuery(() => db.prendas.toArray(), [])
  const deseos = useLiveQuery(() => db.deseos.toArray(), [])
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [subtipo, setSubtipo] = useState<string>()
  const [color, setColor] = useState<string>()
  const [ocasion, setOcasion] = useState<Ocasion>()
  const [descripcion, setDescripcion] = useState('')
  const [aviso, setAviso] = useState<string>()

  if (!prendas || !deseos) return null

  const candidata = categoria ? { categoria, subtipo, color, ocasion } : null
  const similares = candidata ? parecidas(prendas, candidata) : []
  const juego = candidata ? combinables(prendas, candidata) : []
  const pareja = categoria ? parejaDe(categoria) : undefined
  const delTipo = categoria ? prendas.filter((p) => p.categoria === categoria).length : 0

  const loQueBusca = [subtipo ?? (categoria && categoriaDe(categoria).label), color && colorDe(color)?.label.toLowerCase()].filter(Boolean).join(' ')

  const veredicto =
    similares.length === 0
      ? { tono: 'bg-green-50 text-green-900', titulo: 'No tienes nada parecido', texto: 'Sería algo nuevo en tu clóset.' }
      : similares.length <= 2
        ? { tono: 'bg-acento-claro text-tinta', titulo: `Ya tienes ${plural(similares.length, 'prenda parecida', 'prendas parecidas')}`, texto: 'Mira si de verdad sería distinta.' }
        : { tono: 'bg-red-50 text-red-900', titulo: `Ya tienes ${similares.length} prendas parecidas`, texto: 'Probablemente no la necesitas.' }

  async function agregarDeseo() {
    if (!categoria) return
    await db.deseos.add({ descripcion: descripcion.trim() || loQueBusca, categoria, color, nota: subtipo })
    setDescripcion('')
    setAviso('Agregado a tu lista de deseos ✓')
    setTimeout(() => setAviso(undefined), 2500)
  }

  async function loCompre(id: number) {
    await db.deseos.delete(id)
    navigate('/closet/nueva')
  }

  const subtipos = CATEGORIAS.find((c) => c.id === categoria)?.subtipos ?? []

  return (
    <>
      <Link to="/mas" className="-ml-1 text-acento">
        ‹ Más
      </Link>
      <h1 className="mt-1 mb-1 text-3xl font-bold tracking-tight">Antes de comprar</h1>
      <p className="mb-5 text-suave">Dime qué estás pensando comprar y reviso tu clóset.</p>

      <div className="space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">¿Qué es?</h2>
          <Chips
            opciones={CATEGORIAS}
            seleccion={categoria ? [categoria] : []}
            onToggle={(c) => {
              setCategoria(c)
              if (c !== categoria) setSubtipo(undefined)
            }}
            tamano="sm"
          />
          {subtipos.length > 0 && (
            <div className="mt-2">
              <Chips
                opciones={subtipos.map((s) => ({ id: s, label: s }))}
                seleccion={subtipo ? [subtipo] : []}
                onToggle={(s) => setSubtipo(subtipo === s ? undefined : s)}
                tamano="sm"
              />
            </div>
          )}
        </section>

        {categoria && (
          <>
            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">
                ¿De qué color? {color && <span className="font-normal normal-case">{colorDe(color)?.label}</span>}
              </h2>
              <Colores seleccion={color ? [color] : []} onToggle={(c) => setColor(color === c ? undefined : c)} />
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">
                ¿Para qué? <span className="font-normal normal-case">opcional</span>
              </h2>
              <Chips opciones={OCASIONES} seleccion={ocasion ? [ocasion] : []} onToggle={(o) => setOcasion(ocasion === o ? undefined : o)} tamano="sm" />
            </section>

            <section className={`rounded-2xl p-4 ${veredicto.tono}`}>
              <p className="text-lg font-semibold">{veredicto.titulo}</p>
              <p className="text-sm">
                {veredicto.texto} En total tienes {plural(delTipo, 'prenda', 'prendas')} de tipo {categoriaDe(categoria).label.toLowerCase()}.
              </p>
              {similares.length > 0 && <Fila prendas={similares} />}
            </section>

            {pareja && (
              <section className="rounded-2xl border border-linea bg-papel p-4">
                <p className="font-semibold">
                  {juego.length === 0
                    ? 'No tienes con qué combinarla'
                    : `Combinaría con ${plural(juego.length, 'prenda', 'prendas')} que ya tienes`}
                </p>
                <p className="text-sm text-suave">
                  {categoriaDe(pareja).label}
                  {ocasion ? ` para ${ocasionDe(ocasion).label.toLowerCase()}` : ''} que hace juego por color.
                </p>
                {juego.length > 0 && <Fila prendas={juego} />}
              </section>
            )}

            <section>
              <div className="flex gap-2">
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={`Nota: tienda, precio… (${loQueBusca})`}
                  className="min-w-0 flex-1 rounded-xl border border-linea bg-papel px-3 py-2.5 outline-none focus:border-tinta"
                />
                <button type="button" onClick={agregarDeseo} className="shrink-0 rounded-xl bg-tinta px-4 text-sm font-semibold text-white">
                  A deseos
                </button>
              </div>
              {aviso && <p className="mt-2 text-center text-sm text-green-700">{aviso}</p>}
            </section>
          </>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-suave uppercase">Lista de deseos</h2>
          {deseos.length === 0 ? (
            <p className="text-sm text-suave">Aquí quedará lo que quieras comprar más adelante.</p>
          ) : (
            <ul className="space-y-2">
              {deseos.map((d) => {
                const n = parecidas(prendas, { categoria: d.categoria, subtipo: d.nota, color: d.color }).length
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-linea bg-papel p-3">
                    <span
                      className="h-8 w-8 shrink-0 rounded-full border border-black/10"
                      style={{ background: (d.color && colorDe(d.color)?.hex) || 'var(--color-linea)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.descripcion}</p>
                      <p className="text-xs text-suave">
                        {categoriaDe(d.categoria).label} · {n === 0 ? 'nada parecido en tu clóset' : `ya tienes ${plural(n, 'parecida', 'parecidas')}`}
                      </p>
                    </div>
                    <button type="button" onClick={() => loCompre(d.id)} className="shrink-0 text-sm font-medium text-acento">
                      Lo compré
                    </button>
                    <button type="button" aria-label="Quitar de la lista" onClick={() => db.deseos.delete(d.id)} className="shrink-0 px-1 text-xl leading-none text-suave">
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
