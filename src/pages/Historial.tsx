import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { FotoPrenda } from '../components/FotoPrenda'
import { deshacerUso } from '../db/acciones'
import { db, type RegistroUso } from '../db/schema'
import { prendasDe, usePrendasPorId } from '../lib/usePrendas'
import { OCASIONES, categoriaDe } from '../logic/catalogo'

const ocasionDe = (id: RegistroUso['ocasion']) => OCASIONES.find((o) => o.id === id)!

/** Todo lo que te pusiste, día por día, del más reciente al más antiguo. */
export function Historial() {
  const porId = usePrendasPorId()
  const usos = useLiveQuery(() => db.usos.orderBy('fecha').reverse().toArray(), [])

  const dias: { dia: string; usos: RegistroUso[] }[] = []
  for (const u of usos ?? []) {
    const dia = u.fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (dias.at(-1)?.dia === dia) dias.at(-1)!.usos.push(u)
    else dias.push({ dia, usos: [u] })
  }

  return (
    <>
      <Link to="/mas" className="-ml-2 inline-block px-2 py-2 text-acento">
        ‹ Más
      </Link>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Historial</h1>
      <p className="mb-4 text-suave">Lo que te pusiste cada día. Si olvidaste registrar algún día, agrégalo aquí.</p>

      <Link
        to="/historial/nuevo"
        className="mb-5 block rounded-full bg-acento py-3 text-center font-semibold text-white active:bg-acento-osc"
      >
        + Registrar un día pasado
      </Link>

      {usos && usos.length === 0 && <p className="mt-10 text-center text-suave">Todavía no has registrado ningún outfit.</p>}

      {porId && (
        <div className="space-y-5">
          {dias.map(({ dia, usos }) => (
            <section key={dia}>
              <h2 className="mb-2 text-sm font-semibold text-suave first-letter:uppercase">{dia}</h2>
              <ul className="space-y-2">
                {usos.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 rounded-2xl border border-linea bg-papel p-3">
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
                      <button
                        type="button"
                        onClick={() => confirm('¿Quitar este registro del historial?') && deshacerUso(u.id)}
                        className="py-1 text-acento"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
