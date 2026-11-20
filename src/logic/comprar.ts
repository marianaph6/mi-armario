import type { Categoria, Ocasion } from '../db/schema'
import { COLORES } from './catalogo'
import type { PrendaLogica } from './sugerir'

export interface Candidata {
  categoria: Categoria
  subtipo?: string
  color?: string
  ocasion?: Ocasion
}

const NEUTROS = new Set(COLORES.filter((c) => c.neutro).map((c) => c.id))

/** Con qué tipo de prenda se combina cada categoría. */
const PAREJA: Partial<Record<Categoria, Categoria>> = { superior: 'inferior', inferior: 'superior', enterizo: 'calzado' }
export const parejaDe = (c: Categoria) => PAREJA[c]

/**
 * Prendas del clóset parecidas a lo que se quiere comprar: mismo tipo y, si se indicaron,
 * mismo color y subtipo. Primero las más parecidas.
 */
export function parecidas<P extends PrendaLogica>(prendas: P[], c: Candidata): P[] {
  const mismoSubtipo = (p: P) => !!c.subtipo && p.subtipo === c.subtipo
  return prendas
    .filter((p) => p.categoria === c.categoria)
    .filter((p) => (c.color ? p.colores.includes(c.color) : c.subtipo ? mismoSubtipo(p) : true))
    .sort((a, b) => Number(mismoSubtipo(b)) - Number(mismoSubtipo(a)))
}

const combinan = (color: string | undefined, p: PrendaLogica) =>
  !color || NEUTROS.has(color) || p.colores.length === 0 || p.colores.every((x) => NEUTROS.has(x)) || p.colores.includes(color)

/** Prendas que ya tienes y que harían juego con la compra (por tipo, ocasión y color). */
export function combinables<P extends PrendaLogica>(prendas: P[], c: Candidata): P[] {
  const pareja = PAREJA[c.categoria]
  if (!pareja) return []
  return prendas.filter((p) => p.categoria === pareja && (!c.ocasion || p.ocasiones.includes(c.ocasion)) && combinan(c.color, p))
}
