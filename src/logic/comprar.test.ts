import { describe, expect, it } from 'vitest'
import type { Categoria } from '../db/schema'
import { combinables, parecidas } from './comprar'
import type { PrendaLogica } from './sugerir'

let sig = 1
const prenda = (categoria: Categoria, extra: Partial<PrendaLogica> = {}): PrendaLogica => ({
  id: sig++,
  categoria,
  colores: ['negro'],
  ocasiones: ['gym'],
  clima: 'todo',
  estado: 'limpia',
  usos: 0,
  creada: new Date(),
  ...extra,
})

describe('antes de comprar', () => {
  const leggingsNegros = prenda('inferior', { subtipo: 'Leggings' })
  const jeanNegro = prenda('inferior', { subtipo: 'Jean', ocasiones: ['salida'] })
  const leggingsRojos = prenda('inferior', { subtipo: 'Leggings', colores: ['rojo'] })
  const topNegro = prenda('superior')
  const topVerde = prenda('superior', { colores: ['verde'] })
  const closet = [jeanNegro, leggingsNegros, leggingsRojos, topNegro, topVerde]

  it('encuentra lo del mismo tipo y color, primero el mismo subtipo', () => {
    const r = parecidas(closet, { categoria: 'inferior', subtipo: 'Leggings', color: 'negro' })
    expect(r.map((p) => p.id)).toEqual([leggingsNegros.id, jeanNegro.id])
  })

  it('sin color compara por subtipo; sin nada, por tipo', () => {
    expect(parecidas(closet, { categoria: 'inferior', subtipo: 'Leggings' })).toHaveLength(2)
    expect(parecidas(closet, { categoria: 'inferior' })).toHaveLength(3)
    expect(parecidas(closet, { categoria: 'calzado' })).toHaveLength(0)
  })

  it('un color fuerte solo combina con neutros o con el mismo color', () => {
    const r = combinables(closet, { categoria: 'inferior', color: 'rojo' })
    expect(r.map((p) => p.id)).toEqual([topNegro.id])
    expect(combinables(closet, { categoria: 'inferior', color: 'negro' })).toHaveLength(2)
  })

  it('filtra las combinables por ocasión', () => {
    expect(combinables(closet, { categoria: 'superior', color: 'blanco', ocasion: 'salida' }).map((p) => p.id)).toEqual([jeanNegro.id])
  })

  it('lo que vas a donar o botar ya no cuenta como algo que tienes', () => {
    const saliendo = [prenda('inferior', { subtipo: 'Leggings', estado: 'donar' }), prenda('superior', { estado: 'botar' })]
    expect(parecidas(saliendo, { categoria: 'inferior', subtipo: 'Leggings' })).toEqual([])
    expect(combinables(saliendo, { categoria: 'inferior' })).toEqual([])
    // para arreglar sí sigue siendo tuya
    const porArreglar = prenda('inferior', { subtipo: 'Leggings', estado: 'arreglar' })
    expect(parecidas([porArreglar], { categoria: 'inferior', subtipo: 'Leggings' })).toEqual([porArreglar])
  })
})

