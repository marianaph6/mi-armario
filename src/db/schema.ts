import Dexie, { type EntityTable } from 'dexie'

export type Ocasion = 'casa' | 'gym' | 'oficina' | 'salida'
export type Categoria = 'superior' | 'inferior' | 'enterizo' | 'calzado' | 'abrigo' | 'accesorio'
export type Clima = 'todo' | 'calor' | 'frio'
export type Estado = 'limpia' | 'lavar'

export interface Prenda {
  id: number
  foto: Blob
  miniatura: Blob
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

export interface Outfit {
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

export interface RegistroUso {
  id: number
  fecha: Date
  ocasion: Ocasion
  outfitId?: number
  prendaIds: number[]
  /** prendas que este uso pasó a "para lavar" (para poder deshacer) */
  marcadasLavar?: number[]
}

export interface Deseo {
  id: number
  descripcion: string
  categoria: Categoria
  color?: string
  foto?: Blob
  nota?: string
}

export const db = new Dexie('mi-armario') as Dexie & {
  prendas: EntityTable<Prenda, 'id'>
  outfits: EntityTable<Outfit, 'id'>
  usos: EntityTable<RegistroUso, 'id'>
  deseos: EntityTable<Deseo, 'id'>
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
