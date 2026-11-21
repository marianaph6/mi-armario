import { TABLAS, db, sinMarcarCambios, type Sincronizable, type TablaSync } from '../db/schema'
import { aFila, aLocal, type Fila, type FilaDeseo, type FilaOutfit, type FilaPrenda, type FilaUso, type Traductor } from './mapeo'

/** Posición de lectura en la nube: la última fila ya aplicada, en orden (actualizado, id). */
export interface Cursor {
  actualizado: string
  id: string
}

export type FilaNube = Fila & { actualizado: string }

/** Lo que el motor necesita de la nube. En la app es Supabase; en las pruebas, un servidor simulado. */
export interface Nube {
  marcarBorrados(tabla: TablaSync, uids: string[]): Promise<void>
  subir(tabla: TablaSync, filas: Fila[]): Promise<void>
  /** Filas cambiadas después del cursor, ordenadas por (actualizado, id). */
  bajar(tabla: TablaSync, desde: Cursor | undefined, limite: number): Promise<FilaNube[]>
}

type Registro = Sincronizable & { id: number }

const trozos = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

/** Pares id local ↔ uid de prendas y outfits, leídos del índice (sin cargar las fotos). */
async function traductor(): Promise<Traductor> {
  const pares = async (t: 'prendas' | 'outfits') => {
    const col = () => db.table(t).orderBy('uid')
    const [uids, ids] = await Promise.all([col().keys() as Promise<string[]>, col().primaryKeys() as Promise<number[]>])
    return ids.map((id, i) => [id, uids[i]] as const)
  }
  const [p, o] = await Promise.all([pares('prendas'), pares('outfits')])
  return {
    aUid: { prendas: new Map(p), outfits: new Map(o) },
    aId: { prendas: new Map(p.map(([id, uid]) => [uid, id])), outfits: new Map(o.map(([id, uid]) => [uid, id])) },
  }
}

function filaDe(t: TablaSync, r: Registro, tr: Traductor): Fila {
  switch (t) {
    case 'prendas':
      return aFila.prendas(r as never)
    case 'outfits':
      return aFila.outfits(r as never, tr)
    case 'usos':
      return aFila.usos(r as never, tr)
    case 'deseos':
      return aFila.deseos(r as never)
  }
}

function localDe(t: TablaSync, f: Fila, tr: Traductor): object {
  switch (t) {
    case 'prendas':
      return aLocal.prendas(f as FilaPrenda)
    case 'outfits':
      return aLocal.outfits(f as FilaOutfit, tr)
    case 'usos':
      return aLocal.usos(f as FilaUso, tr)
    case 'deseos':
      return aLocal.deseos(f as FilaDeseo)
  }
}

async function aplicar(t: TablaSync, f: FilaNube, tr: Traductor) {
  const tabla = db.table<Registro, number>(t)
  const local = await tabla.where('uid').equals(f.id).first()
  // Un cambio local pendiente gana: se sube en la próxima vuelta y pisa a la nube.
  if (local && (local.cambio ?? 0) > 0) return
  if (f.borrado) {
    if (local) await tabla.delete(local.id)
    return
  }
  const datos = { ...localDe(t, f, tr), cambio: 0 }
  if (local) await tabla.update(local.id, datos)
  else await tabla.add(datos as Registro)
}

/**
 * Una vuelta completa: avisa eliminaciones, sube cambios locales y baja lo que cambió en la nube.
 * Lo nuevo de la nube nunca pisa un cambio local que todavía no se subió.
 */
export async function sincronizarCon(nube: Nube, usuario: string, lote = 500) {
  // 1. Eliminaciones
  const borrados = await db.borrados.toArray()
  for (const t of TABLAS) {
    for (const uids of trozos(
      borrados.filter((b) => b.tabla === t).map((b) => b.uid),
      lote,
    ))
      await nube.marcarBorrados(t, uids)
  }
  if (borrados.length) await db.borrados.bulkDelete(borrados.map((b): [TablaSync, string] => [b.tabla, b.uid]))

  // 2. Cambios locales (en orden: los outfits y usos se refieren a prendas ya subidas)
  const tr = await traductor()
  for (const t of TABLAS) {
    const pendientes = await db
      .table<Registro, number>(t)
      .filter((r) => (r.cambio ?? 0) > 0)
      .toArray()
    for (const grupo of trozos(pendientes, lote)) {
      await nube.subir(
        t,
        grupo.map((r) => filaDe(t, r, tr)),
      )
      // si el registro cambió mientras se subía, queda pendiente para la próxima vuelta
      await sinMarcarCambios(() =>
        db.transaction('rw', t, async () => {
          for (const r of grupo)
            await db
              .table<Registro, number>(t)
              .where('id')
              .equals(r.id)
              .modify((x) => {
                if (x.cambio === r.cambio) x.cambio = 0
              })
        }),
      )
    }
  }

  // 3. Cambios de la nube
  for (const t of TABLAS) {
    const clave = `cursor:${usuario}:${t}`
    let cursor = (await db.meta.get(clave))?.valor as Cursor | undefined
    for (;;) {
      const filas = await nube.bajar(t, cursor, lote)
      if (filas.length === 0) break
      const ultima = filas[filas.length - 1]
      const tr = await traductor()
      await sinMarcarCambios(() =>
        db.transaction('rw', [t, 'meta'], async () => {
          for (const f of filas) await aplicar(t, f, tr)
          await db.meta.put({ clave, valor: { actualizado: ultima.actualizado, id: ultima.id } })
        }),
      )
      cursor = { actualizado: ultima.actualizado, id: ultima.id }
      if (filas.length < lote) break
    }
  }
}
