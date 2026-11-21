import type { Prenda } from '../db/schema'

const DIA = 86_400_000
/** Una prenda disponible que no se usa hace este tiempo es candidata a salir del clóset. */
export const DIAS_OLVIDADA = 120
/** Las prendas nuevas tienen este margen antes de considerarse olvidadas aunque nunca se hayan usado. */
export const DIAS_NUEVA = 60

/** Prendas disponibles que llevan mucho sin usarse, de la más olvidada a la menos. */
export function olvidadas<P extends Pick<Prenda, 'estado' | 'creada' | 'ultimoUso'>>(prendas: P[], ahora = Date.now()): P[] {
  const dias = (d?: Date) => (d ? (ahora - new Date(d).getTime()) / DIA : Infinity)
  return prendas
    .filter((p) => p.estado === 'limpia' && dias(p.creada) >= DIAS_NUEVA && dias(p.ultimoUso) >= DIAS_OLVIDADA)
    .sort((a, b) => (a.ultimoUso?.getTime() ?? 0) - (b.ultimoUso?.getTime() ?? 0))
}
