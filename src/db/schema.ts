import Dexie, { type EntityTable, type Table } from 'dexie'

export type Ocasion = 'casa' | 'gym' | 'oficina' | 'salida'
export type Categoria = 'superior' | 'inferior' | 'enterizo' | 'calzado' | 'abrigo' | 'accesorio'
export type Clima = 'todo' | 'calor' | 'frio'
export type Estado = 'limpia' | 'lavar'

/**
 * Campos para sincronizar con la nube (los pone la base sola, ver los hooks al final):
 * `uid` identifica el registro en todos los dispositivos; `cambio` > 0 marca un cambio local que falta subir.
 */
export interface Sincronizable {
  uid?: string
  cambio?: number
}

export interface Prenda extends Sincronizable {
  id: number
  /** puede faltar en una prenda que llegó de la nube y aún no baja su foto */
  foto?: Blob
  miniatura?: Blob
  nombre?: string
  categoria: Categoria
  subtipo?: string
  colores: string[]
  ocasiones: Ocasion[]
  clima: Clima
  estado: Estado
  usos: number
  ultimoUso?: Date
  creada: Date
  notas?: string
}

export interface Outfit extends Sincronizable {
  id: number
  nombre?: string
  prendaIds: number[]
  ocasion: Ocasion
  favorito: boolean
  fotoLook?: Blob
  creado: Date
  ultimoUso?: Date
  usos: number
}

export interface RegistroUso extends Sincronizable {
  id: number
  fecha: Date
  ocasion: Ocasion
  outfitId?: number
  prendaIds: number[]
  /** prendas que este uso pasó a "para lavar" (para poder deshacer) */
  marcadasLavar?: number[]
}

export interface Deseo extends Sincronizable {
  id: number
  descripcion: string
  categoria: Categoria
  color?: string
  foto?: Blob
  nota?: string
}

export const TABLAS = ['prendas', 'outfits', 'usos', 'deseos'] as const
export type TablaSync = (typeof TABLAS)[number]

/** Eliminaciones locales que faltan avisar a la nube. */
export interface Borrado {
  tabla: TablaSync
  uid: string
}

export interface Meta {
  clave: string
  valor: unknown
}

export const db = new Dexie('mi-armario') as Dexie & {
  prendas: EntityTable<Prenda, 'id'>
  outfits: EntityTable<Outfit, 'id'>
  usos: EntityTable<RegistroUso, 'id'>
  deseos: EntityTable<Deseo, 'id'>
  borrados: Table<Borrado, [TablaSync, string]>
  meta: EntityTable<Meta, 'clave'>
}

db.version(1).stores({
  prendas: '++id, categoria, estado, *ocasiones, ultimoUso, creada',
  outfits: '++id, ocasion, ultimoUso',
  usos: '++id, fecha, ocasion',
  deseos: '++id, categoria',
})

db.version(2).stores({
  usos: '++id, fecha, ocasion, outfitId, *prendaIds',
})

/** UUID v4; `crypto.randomUUID` no existe fuera de HTTPS (por ejemplo al probar por la IP de la Wi-Fi). */
export function nuevoUid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

db.version(3)
  .stores({
    prendas: '++id, &uid, categoria, estado, *ocasiones, ultimoUso, creada',
    outfits: '++id, &uid, ocasion, ultimoUso',
    usos: '++id, &uid, fecha, ocasion, outfitId, *prendaIds',
    deseos: '++id, &uid, categoria',
    borrados: '[tabla+uid]',
    meta: 'clave',
  })
  .upgrade((tx) =>
    Promise.all(
      TABLAS.map((t) =>
        tx
          .table(t)
          .toCollection()
          .modify((r: Sincronizable) => {
            r.uid ??= nuevoUid()
            r.cambio = Date.now()
          }),
      ),
    ),
  )

// --- Registro de cambios para la sincronización ---

let aplicandoNube = false
let avisar = () => {}

/** Para que el motor de sincronización se entere de cada cambio local. */
export function alCambiarLocal(fn: () => void) {
  avisar = fn
}

/** Escribe sin marcar los registros como "cambio local" (lo usa la sincronización al bajar datos). */
export async function sinMarcarCambios<T>(fn: () => Promise<T>): Promise<T> {
  aplicandoNube = true
  try {
    return await fn()
  } finally {
    aplicandoNube = false
  }
}

for (const t of TABLAS) {
  const tabla = db.table<Sincronizable>(t)
  tabla.hook('creating', (_clave, obj) => {
    obj.uid ??= nuevoUid()
    if (aplicandoNube) return
    obj.cambio = Date.now()
    avisar()
  })
  tabla.hook('updating', (cambios) => {
    if (aplicandoNube || 'cambio' in cambios) return
    avisar()
    return { cambio: Date.now() }
  })
  tabla.hook('deleting', (_clave, obj, tx) => {
    if (aplicandoNube || !obj?.uid) return
    const uid = obj.uid
    tx.on('complete', () => {
      db.borrados.put({ tabla: t, uid }).then(avisar, () => {})
    })
  })
}
