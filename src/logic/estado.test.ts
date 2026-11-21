import { describe, expect, it } from 'vitest'
import type { Estado } from '../db/schema'
import { olvidadas } from './estado'

const AHORA = new Date(2026, 10, 20).getTime()
const hace = (dias: number) => new Date(AHORA - dias * 86_400_000)
const p = (nombre: string, creadaHace: number, usadaHace?: number, estado: Estado = 'limpia') => ({
  nombre,
  estado,
  creada: hace(creadaHace),
  ultimoUso: usadaHace === undefined ? undefined : hace(usadaHace),
})

describe('olvidadas', () => {
  it('propone lo disponible que no se usa hace más de 4 meses, lo más olvidado primero', () => {
    const r = olvidadas([p('reciente', 300, 10), p('vieja', 300, 200), p('muy vieja', 400, 380), p('nunca', 90)], AHORA)
    expect(r.map((x) => x.nombre)).toEqual(['nunca', 'muy vieja', 'vieja'])
  })

  it('da margen a las prendas nuevas y no repite las que ya tienen otro estado', () => {
    expect(olvidadas([p('nueva sin usar', 20), p('ya para donar', 300, 300, 'donar'), p('por lavar', 300, 300, 'lavar')], AHORA)).toEqual([])
  })
})
