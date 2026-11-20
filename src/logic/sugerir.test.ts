import { describe, expect, it } from 'vitest'
import type { Categoria, Ocasion, Outfit, RegistroUso } from '../db/schema'
import { queFalta, sugerir, type PrendaLogica } from './sugerir'

const AHORA = new Date(2026, 10, 16, 9, 0)
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000)

let sig = 1
const prenda = (categoria: Categoria, extra: Partial<PrendaLogica> = {}): PrendaLogica => ({
  id: sig++,
  categoria,
  colores: ['negro'],
  ocasiones: ['gym'],
  clima: 'todo',
  estado: 'limpia',
  usos: 0,
  creada: hace(100),
  ...extra,
})
const outfit = (prendaIds: number[], extra: Partial<Outfit> = {}): Outfit => ({
  id: sig++,
  prendaIds,
  ocasion: 'gym',
  favorito: false,
  creado: hace(50),
  usos: 0,
  ...extra,
})
const uso = (prendaIds: number[], dias: number, ocasion: Ocasion = 'gym'): RegistroUso => ({ id: sig++, fecha: hace(dias), ocasion, prendaIds })

const base = { outfits: [], usos: [], ocasion: 'gym' as Ocasion, ahora: AHORA, azar: () => 0 }
const categorias = (ids: number[], prendas: PrendaLogica[]) => ids.map((id) => prendas.find((p) => p.id === id)!.categoria).sort()

describe('sugerir', () => {
  it('arma superior + inferior + calzado solo con prendas de la ocasión', () => {
    const prendas = [
      prenda('superior'),
      prenda('inferior'),
      prenda('calzado'),
      prenda('superior', { ocasiones: ['oficina'] }),
      prenda('calzado', { ocasiones: ['salida'] }),
    ]
    const r = sugerir({ ...base, prendas })
    expect(r).toHaveLength(1)
    expect(categorias(r[0].prendaIds, prendas)).toEqual(['calzado', 'inferior', 'superior'])
    expect(r[0].prendaIds).toEqual([prendas[0].id, prendas[1].id, prendas[2].id])
  })

  it('no usa prendas para lavar', () => {
    const sucia = prenda('superior', { estado: 'lavar' })
    const limpia = prenda('superior')
    const prendas = [sucia, limpia, prenda('inferior'), prenda('calzado')]
    const r = sugerir({ ...base, prendas })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((s) => !s.prendaIds.includes(sucia.id))).toBe(true)
  })

  it('en casa no incluye calzado', () => {
    const prendas = [prenda('superior', { ocasiones: ['casa'] }), prenda('inferior', { ocasiones: ['casa'] }), prenda('calzado', { ocasiones: ['casa'] })]
    const r = sugerir({ ...base, ocasion: 'casa', prendas })
    expect(categorias(r[0].prendaIds, prendas)).toEqual(['inferior', 'superior'])
  })

  it('un enterizo vale como outfit; sin inferior no hay sugerencia', () => {
    const soloTop = [prenda('superior'), prenda('calzado')]
    expect(sugerir({ ...base, prendas: soloTop })).toEqual([])
    expect(queFalta(soloTop, 'gym')).toEqual(['inferior'])

    const conEnterizo = [...soloTop, prenda('enterizo')]
    const r = sugerir({ ...base, prendas: conEnterizo })
    expect(categorias(r[0].prendaIds, conEnterizo)).toEqual(['calzado', 'enterizo'])
    expect(queFalta(conEnterizo, 'gym')).toEqual([])
  })

  it('prefiere lo que lleva más tiempo sin usarse', () => {
    const olvidada = prenda('superior')
    const deAyer = prenda('superior', { usos: 8, ultimoUso: hace(1) })
    const prendas = [deAyer, olvidada, prenda('inferior'), prenda('calzado')]
    const r = sugerir({ ...base, prendas })
    expect(r[0].prendaIds).toContain(olvidada.id)
  })

  it('no repite como primera opción el outfit usado en los últimos 7 días', () => {
    const [s1, s2, inf, cal] = [prenda('superior'), prenda('superior'), prenda('inferior'), prenda('calzado')]
    const usado = [s1.id, inf.id, cal.id]
    const r = sugerir({ ...base, prendas: [s1, s2, inf, cal], usos: [uso(usado, 3)] })
    expect(r[0].prendaIds).toContain(s2.id)
  })

  it('evita mezclar tres colores fuertes', () => {
    const inf = prenda('inferior', { colores: ['rojo'] })
    const cal = prenda('calzado', { colores: ['verde'] })
    const chillon = prenda('superior', { colores: ['fucsia'] })
    const neutro = prenda('superior', { colores: ['blanco'] })
    const r = sugerir({ ...base, prendas: [chillon, neutro, inf, cal] })
    expect(r[0].prendaIds).toContain(neutro.id)
  })

  it('reconoce un outfit guardado y le da ventaja si es favorito', () => {
    const [s1, s2, inf, cal] = [prenda('superior'), prenda('superior'), prenda('inferior'), prenda('calzado')]
    const fav = outfit([s2.id, inf.id, cal.id], { favorito: true })
    const r = sugerir({ ...base, prendas: [s1, s2, inf, cal], outfits: [fav] })
    expect(r[0].outfitId).toBe(fav.id)
    expect(r[1].outfitId).toBeUndefined()
  })

  it('la siguiente opción cambia prendas respecto a la primera', () => {
    const prendas = [prenda('superior'), prenda('superior'), prenda('inferior'), prenda('inferior'), prenda('calzado')]
    const r = sugerir({ ...base, prendas })
    expect(r).toHaveLength(4)
    const repetidas = r[1].prendaIds.filter((id) => r[0].prendaIds.includes(id))
    expect(repetidas).toHaveLength(1) // solo el único par de tenis
  })
})
