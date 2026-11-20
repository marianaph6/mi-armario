import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, type Prenda } from '../db/schema'
import { CATEGORIAS } from '../logic/catalogo'

const ORDEN = new Map(CATEGORIAS.map((c, i) => [c.id, i]))

/** Todas las prendas, indexadas por id. `undefined` mientras cargan. */
export function usePrendasPorId() {
  const prendas = useLiveQuery(() => db.prendas.toArray(), [])
  return useMemo(() => (prendas ? new Map(prendas.map((p) => [p.id, p])) : undefined), [prendas])
}

/** Prendas de un outfit en orden de arriba a abajo (superior, inferior, calzado…). */
export function prendasDe(ids: number[], porId: Map<number, Prenda>) {
  return ids
    .map((id) => porId.get(id))
    .filter((p) => p !== undefined)
    .sort((a, b) => ORDEN.get(a.categoria)! - ORDEN.get(b.categoria)!)
}
