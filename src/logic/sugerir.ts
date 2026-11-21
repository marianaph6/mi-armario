import type { Categoria, Ocasion, Outfit, Prenda, RegistroUso } from '../db/schema'
import { COLORES } from './catalogo'

/** Lo que el motor necesita de una prenda (sin las fotos). */
export type PrendaLogica = Omit<Prenda, 'foto' | 'miniatura'>

export interface Sugerencia {
  prendaIds: number[]
  /** si coincide con un outfit guardado */
  outfitId?: number
  puntaje: number
}

export interface Entrada {
  prendas: PrendaLogica[]
  outfits: Outfit[]
  usos: RegistroUso[]
  ocasion: Ocasion
  ahora?: Date
  /** generador aleatorio 0..1 (se puede fijar en pruebas) */
  azar?: () => number
  cuantas?: number
}

const DIA = 86_400_000
const DIAS_TOPE = 30
const DIAS_SIN_REPETIR = 7
const MAX_POR_GRUPO = 12
const NEUTROS = new Set(COLORES.filter((c) => c.neutro).map((c) => c.id))

export const clave = (ids: number[]) => [...ids].sort((a, b) => a - b).join('-')

const disponibles = (prendas: PrendaLogica[], ocasion: Ocasion) =>
  prendas.filter((p) => p.estado === 'limpia' && p.ocasiones.includes(ocasion))

/** Si no se puede armar nada, dice qué tipos de prenda limpia faltan para esa ocasión. */
export function queFalta(prendas: PrendaLogica[], ocasion: Ocasion): Categoria[] {
  const d = disponibles(prendas, ocasion)
  const hay = (c: Categoria) => d.some((p) => p.categoria === c)
  if (hay('enterizo') || (hay('superior') && hay('inferior')) || (ocasion === 'playa' && hay('bano'))) return []
  return (['superior', 'inferior'] as const).filter((c) => !hay(c))
}

export function sugerir({ prendas, outfits, usos, ocasion, ahora = new Date(), azar = Math.random, cuantas = 10 }: Entrada): Sugerencia[] {
  const hoy = new Date(ahora).setHours(0, 0, 0, 0)
  const diasSinUsar = (p: PrendaLogica) =>
    p.ultimoUso ? Math.min(DIAS_TOPE, Math.max(0, Math.floor((hoy - new Date(p.ultimoUso).setHours(0, 0, 0, 0)) / DIA))) : DIAS_TOPE

  const porId = new Map(prendas.map((p) => [p.id, p]))
  const limpias = disponibles(prendas, ocasion)
  // si hay muchas prendas, se combinan solo las que llevan más tiempo guardadas
  const grupo = (c: Categoria) =>
    limpias
      .filter((p) => p.categoria === c)
      .sort((a, b) => diasSinUsar(b) - diasSinUsar(a) || a.usos - b.usos)
      .slice(0, MAX_POR_GRUPO)

  const superiores = grupo('superior')
  const inferiores = grupo('inferior')
  const enterizos = grupo('enterizo')
  // en la playa, un vestido de baño también es un outfit completo
  const banos = ocasion === 'playa' ? grupo('bano') : []
  const calzados = ocasion === 'casa' ? [] : grupo('calzado')

  const bases: PrendaLogica[][] = [
    ...superiores.flatMap((s) => inferiores.map((i) => [s, i])),
    ...enterizos.map((e) => [e]),
    ...banos.map((b) => [b]),
  ]
  const combos = new Map<string, PrendaLogica[]>()
  for (const base of bases) {
    for (const combo of calzados.length ? calzados.map((c) => [...base, c]) : [base]) {
      combos.set(clave(combo.map((p) => p.id)), combo)
    }
  }

  // los outfits guardados de la ocasión también compiten, aunque no sigan la plantilla
  const guardados = new Map<string, Outfit>()
  for (const o of outfits) {
    if (o.ocasion !== ocasion) continue
    const piezas = o.prendaIds.map((id) => porId.get(id))
    if (piezas.length === 0 || piezas.some((p) => !p || p.estado !== 'limpia')) continue
    const k = clave(o.prendaIds)
    guardados.set(k, o)
    if (!combos.has(k)) combos.set(k, piezas as PrendaLogica[])
  }

  const desde = hoy - DIAS_SIN_REPETIR * DIA
  const recientes = new Set(usos.filter((u) => u.fecha.getTime() >= desde).map((u) => clave(u.prendaIds)))
  const usadasHoy = new Set(usos.filter((u) => u.fecha.getTime() >= hoy).flatMap((u) => u.prendaIds))

  const puntuar = (k: string, combo: PrendaLogica[]) => {
    const n = combo.length
    // rotación: premia lo que lleva más tiempo sin usarse y lo poco usado
    let puntaje = (combo.reduce((s, p) => s + diasSinUsar(p), 0) / n / DIAS_TOPE) * 3
    puntaje += combo.reduce((s, p) => s + 1 / (1 + p.usos), 0) / n
    puntaje -= combo.filter((p) => usadasHoy.has(p.id)).length * 2
    // color: neutros con todo; máximo dos colores fuertes
    const fuertes = new Set(combo.flatMap((p) => p.colores).filter((c) => !NEUTROS.has(c)))
    puntaje += fuertes.size <= 1 ? 1 : fuertes.size === 2 ? 0 : -2
    if (combo.filter((p) => p.colores.includes('estampado')).length > 1) puntaje -= 1.5
    if (combo.some((p) => p.clima === 'calor') && combo.some((p) => p.clima === 'frio')) puntaje -= 2
    if (recientes.has(k)) puntaje -= 3
    const guardado = guardados.get(k)
    if (guardado) puntaje += guardado.favorito ? 1.5 : 0.5
    return puntaje
  }

  const candidatos = [...combos].map(([k, combo]) => ({ k, combo, puntaje: puntuar(k, combo) })).sort((a, b) => b.puntaje - a.puntaje)
  if (candidatos.length === 0) return []

  // la primera sale al azar entre las 5 mejores; las siguientes evitan repetir prendas ya mostradas
  const elegidos: typeof candidatos = []
  const vistas = new Map<number, number>()
  const tomar = (i: number) => {
    const [c] = candidatos.splice(i, 1)
    elegidos.push(c)
    for (const p of c.combo) vistas.set(p.id, (vistas.get(p.id) ?? 0) + 1)
  }
  tomar(Math.floor(azar() * Math.min(5, candidatos.length)))
  while (elegidos.length < cuantas && candidatos.length > 0) {
    let mejor = 0
    let mejorValor = -Infinity
    candidatos.forEach((c, i) => {
      const valor = c.puntaje - c.combo.reduce((s, p) => s + (vistas.get(p.id) ?? 0), 0) * 0.8
      if (valor > mejorValor) {
        mejorValor = valor
        mejor = i
      }
    })
    tomar(mejor)
  }

  return elegidos.map((c) => ({ prendaIds: c.combo.map((p) => p.id), outfitId: guardados.get(c.k)?.id, puntaje: c.puntaje }))
}
