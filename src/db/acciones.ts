import { inicioDeHoy } from '../lib/fechas'
import { db, type Categoria, type Ocasion } from './schema'

/** Tipos de prenda que van a la ropa sucia después del gym. */
const SE_LAVA: Categoria[] = ['superior', 'inferior', 'enterizo']

const masTarde = (a: Date | undefined, b: Date) => (a && a > b ? a : b)

/**
 * "Me lo pongo": guarda el uso y actualiza los contadores de cada prenda (y del outfit, si es uno guardado).
 * Con `fecha` de un día anterior queda como registro del pasado: no manda nada a lavar
 * y no pisa un `ultimoUso` más reciente.
 */
export async function registrarUso({ ocasion, prendaIds, outfitId, fecha }: { ocasion: Ocasion; prendaIds: number[]; outfitId?: number; fecha?: Date }) {
  const cuando = fecha ?? new Date()
  const esPasado = cuando < inicioDeHoy()
  await db.transaction('rw', db.prendas, db.outfits, db.usos, async () => {
    const prendas = (await db.prendas.bulkGet(prendaIds)).filter((p) => p !== undefined)
    const marcadasLavar =
      ocasion === 'gym' && !esPasado ? prendas.filter((p) => p.estado === 'limpia' && SE_LAVA.includes(p.categoria)).map((p) => p.id) : []
    await db.usos.add({ fecha: cuando, ocasion, outfitId, prendaIds: prendas.map((p) => p.id), marcadasLavar })
    const outfit = outfitId !== undefined ? await db.outfits.get(outfitId) : undefined
    if (outfit) await db.outfits.update(outfit.id, { usos: outfit.usos + 1, ultimoUso: masTarde(outfit.ultimoUso, cuando) })
    for (const p of prendas) {
      await db.prendas.update(p.id, {
        usos: p.usos + 1,
        ultimoUso: masTarde(p.ultimoUso, cuando),
        ...(marcadasLavar.includes(p.id) ? { estado: 'lavar' as const } : {}),
      })
    }
  })
}

const masReciente = (fechas: Date[]) => (fechas.length ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : undefined)

export async function deshacerUso(usoId: number) {
  await db.transaction('rw', db.prendas, db.outfits, db.usos, async () => {
    const uso = await db.usos.get(usoId)
    if (!uso) return
    await db.usos.delete(usoId)
    for (const pid of uso.prendaIds) {
      const p = await db.prendas.get(pid)
      if (!p) continue
      const resto = await db.usos.where('prendaIds').equals(pid).toArray()
      await db.prendas.update(pid, {
        usos: Math.max(0, p.usos - 1),
        ultimoUso: masReciente(resto.map((u) => u.fecha)),
        ...(uso.marcadasLavar?.includes(pid) ? { estado: 'limpia' as const } : {}),
      })
    }
    if (uso.outfitId !== undefined) {
      const o = await db.outfits.get(uso.outfitId)
      if (o) {
        const resto = await db.usos.where('outfitId').equals(o.id).toArray()
        await db.outfits.update(o.id, { usos: Math.max(0, o.usos - 1), ultimoUso: masReciente(resto.map((u) => u.fecha)) })
      }
    }
  })
}

/** Elimina la prenda y la quita de los outfits; un outfit que queda vacío también se elimina. */
export async function eliminarPrenda(id: number) {
  await db.transaction('rw', db.prendas, db.outfits, async () => {
    await db.prendas.delete(id)
    const afectados = await db.outfits.filter((o) => o.prendaIds.includes(id)).toArray()
    for (const o of afectados) {
      const prendaIds = o.prendaIds.filter((x) => x !== id)
      if (prendaIds.length) await db.outfits.update(o.id, { prendaIds })
      else await db.outfits.delete(o.id)
    }
  })
}

export async function marcarTodoLimpio() {
  await db.prendas.where('estado').equals('lavar').modify({ estado: 'limpia' })
}
