import { TABLAS, db, nuevoUid, sinMarcarCambios, type Prenda, type Sincronizable, type TablaSync } from '../db/schema'
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
  subirFoto(ruta: string, foto: Blob): Promise<void>
  /** Anota en la fila de la prenda dónde quedaron sus fotos. Devuelve false si la fila no existe. */
  fijarFotos(uid: string, fotoRuta: string, miniRuta: string): Promise<boolean>
  bajarFoto(ruta: string): Promise<Blob>
  /** Borra los archivos de la carpeta salvo los indicados. */
  limpiarFotos(carpeta: string, conservar: string[]): Promise<void>
}

/** Cada prenda tiene su carpeta: <usuario>/prendas/<uid>/ (el primer nivel lo exige la regla de Storage). */
const carpetaDe = (usuario: string, uid: string) => `${usuario}/prendas/${uid}`

/** Ejecuta `fn` sobre los elementos con a lo más `n` a la vez. */
async function enParalelo<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => {
    while (i < xs.length) await fn(xs[i++])
  }))
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
  const datos: Record<string, unknown> = { ...localDe(t, f, tr), cambio: 0 }
  // si en otro dispositivo cambió la foto, la de aquí ya no sirve: se baja la nueva al final de la vuelta
  if (t === 'prendas' && local) {
    const p = local as Prenda
    const fila = f as FilaPrenda
    if ((fila.foto_path ?? undefined) !== p.fotoRuta) datos.foto = undefined
    if ((fila.miniatura_path ?? undefined) !== p.miniRuta) datos.miniatura = undefined
  }
  if (local) await tabla.update(local.id, datos)
  else await tabla.add(datos as unknown as Registro)
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
  for (const b of borrados) if (b.tabla === 'prendas') await nube.limpiarFotos(carpetaDe(usuario, b.uid), [])
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

  // 3. Fotos nuevas. Las rutas se anotan aparte y nunca viajan con la fila: así una fila vieja de otro
  //    dispositivo no puede volver a apuntar a una foto que ya se borró.
  const sinSubir = await db.prendas.filter((p) => !!p.foto && !!p.miniatura && !p.fotoRuta).toArray()
  await enParalelo(sinSubir, 3, async (p) => {
    const carpeta = carpetaDe(usuario, p.uid!)
    const nombre = nuevoUid().slice(0, 8) // nombre nuevo en cada cambio: ningún caché muestra la foto vieja
    const fotoRuta = `${carpeta}/${nombre}.jpg`
    const miniRuta = `${carpeta}/${nombre}-mini.jpg`
    await nube.subirFoto(miniRuta, p.miniatura!)
    await nube.subirFoto(fotoRuta, p.foto!)
    if (!(await nube.fijarFotos(p.uid!, fotoRuta, miniRuta))) return // la fila aún no existe: próxima vuelta
    await nube.limpiarFotos(carpeta, [fotoRuta, miniRuta])
    // si la foto cambió mientras se subía, ya no es la misma: queda sin ruta y se sube en la próxima vuelta
    await sinMarcarCambios(() =>
      db.prendas
        .where('id')
        .equals(p.id)
        .modify((x) => {
          if (!x.fotoRuta && x.foto?.size === p.foto!.size && x.miniatura?.size === p.miniatura!.size) Object.assign(x, { fotoRuta, miniRuta })
        }),
    )
  })

  // 4. Cambios de la nube
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

  // 5. Fotos que faltan en este dispositivo (primero las miniaturas, que son las que se ven en las listas)
  for (const [campo, ruta] of [['miniatura', 'miniRuta'], ['foto', 'fotoRuta']] as const) {
    const faltan = await db.prendas.filter((p) => !!p[ruta] && !p[campo]).toArray()
    await enParalelo(faltan, 4, async (p) => {
      try {
        const blob = await nube.bajarFoto(p[ruta]!)
        await sinMarcarCambios(() =>
          db.prendas
            .where('id')
            .equals(p.id)
            .modify((x) => {
              if (x[ruta] === p[ruta]) x[campo] = blob
            }),
        )
      } catch (e) {
        console.warn('[sync] no se pudo bajar', p[ruta], e) // se reintenta en la próxima vuelta
      }
    })
  }
}
