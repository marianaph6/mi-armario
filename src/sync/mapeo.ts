import type { Categoria, Clima, Deseo, Estado, Ocasion, Outfit, Prenda, RegistroUso } from '../db/schema'

/** Columnas comunes de las tablas en Supabase (ver supabase/esquema.sql). */
export interface FilaBase {
  id: string
  actualizado?: string
  borrado?: boolean
}

export interface FilaPrenda extends FilaBase {
  nombre: string | null
  categoria: Categoria
  subtipo: string | null
  colores: string[]
  ocasiones: Ocasion[]
  clima: Clima
  estado: Estado
  usos: number
  ultimo_uso: string | null
  creada: string
  notas: string | null
  /** solo se leen: las rutas las escribe el paso de fotos, nunca la fila completa (ver motor.ts) */
  foto_path?: string | null
  miniatura_path?: string | null
}

export interface FilaOutfit extends FilaBase {
  nombre: string | null
  prenda_ids: string[]
  ocasion: Ocasion
  favorito: boolean
  creado: string
  ultimo_uso: string | null
  usos: number
}

export interface FilaUso extends FilaBase {
  fecha: string
  ocasion: Ocasion
  outfit_id: string | null
  prenda_ids: string[]
  marcadas_lavar: string[]
}

export interface FilaDeseo extends FilaBase {
  descripcion: string
  categoria: Categoria
  color: string | null
  nota: string | null
}

export type Fila = FilaPrenda | FilaOutfit | FilaUso | FilaDeseo

/** Localmente las prendas y outfits se enlazan por número; en la nube, por uid. */
export interface Traductor {
  /** id local → uid */
  aUid: { prendas: Map<number, string>; outfits: Map<number, string> }
  /** uid → id local */
  aId: { prendas: Map<string, number>; outfits: Map<string, number> }
}

const iso = (d?: Date) => (d ? new Date(d).toISOString() : null)
const fecha = (s: string | null) => (s ? new Date(s) : undefined)
const opcional = <T>(v: T | null) => v ?? undefined
/** Traduce una lista de referencias y descarta las que ya no existen. */
const traducir = <A, B>(xs: A[] | undefined, m: Map<A, B>) =>
  (xs ?? []).flatMap((x) => {
    const y = m.get(x)
    return y === undefined ? [] : [y]
  })

export const aFila = {
  prendas: (p: Prenda): FilaPrenda => ({
    id: p.uid!,
    nombre: p.nombre ?? null,
    categoria: p.categoria,
    subtipo: p.subtipo ?? null,
    colores: p.colores,
    ocasiones: p.ocasiones,
    clima: p.clima,
    estado: p.estado,
    usos: p.usos,
    ultimo_uso: iso(p.ultimoUso),
    creada: iso(p.creada)!,
    notas: p.notas ?? null,
    borrado: false,
  }),
  outfits: (o: Outfit, t: Traductor): FilaOutfit => ({
    id: o.uid!,
    nombre: o.nombre ?? null,
    prenda_ids: traducir(o.prendaIds, t.aUid.prendas),
    ocasion: o.ocasion,
    favorito: o.favorito,
    creado: iso(o.creado)!,
    ultimo_uso: iso(o.ultimoUso),
    usos: o.usos,
    borrado: false,
  }),
  usos: (u: RegistroUso, t: Traductor): FilaUso => ({
    id: u.uid!,
    fecha: iso(u.fecha)!,
    ocasion: u.ocasion,
    outfit_id: u.outfitId === undefined ? null : (t.aUid.outfits.get(u.outfitId) ?? null),
    prenda_ids: traducir(u.prendaIds, t.aUid.prendas),
    marcadas_lavar: traducir(u.marcadasLavar, t.aUid.prendas),
    borrado: false,
  }),
  deseos: (d: Deseo): FilaDeseo => ({
    id: d.uid!,
    descripcion: d.descripcion,
    categoria: d.categoria,
    color: d.color ?? null,
    nota: d.nota ?? null,
    borrado: false,
  }),
}

/** Campos locales a partir de una fila de la nube (sin id local ni fotos). */
export const aLocal = {
  prendas: (f: FilaPrenda): Omit<Prenda, 'id'> => ({
    uid: f.id,
    nombre: opcional(f.nombre),
    categoria: f.categoria,
    subtipo: opcional(f.subtipo),
    colores: f.colores,
    ocasiones: f.ocasiones,
    clima: f.clima,
    estado: f.estado,
    usos: f.usos,
    ultimoUso: fecha(f.ultimo_uso),
    creada: fecha(f.creada) ?? new Date(),
    notas: opcional(f.notas),
    fotoRuta: opcional(f.foto_path),
    miniRuta: opcional(f.miniatura_path),
  }),
  outfits: (f: FilaOutfit, t: Traductor): Omit<Outfit, 'id'> => ({
    uid: f.id,
    nombre: opcional(f.nombre),
    prendaIds: traducir(f.prenda_ids, t.aId.prendas),
    ocasion: f.ocasion,
    favorito: f.favorito,
    creado: fecha(f.creado) ?? new Date(),
    ultimoUso: fecha(f.ultimo_uso),
    usos: f.usos,
  }),
  usos: (f: FilaUso, t: Traductor): Omit<RegistroUso, 'id'> => ({
    uid: f.id,
    fecha: new Date(f.fecha),
    ocasion: f.ocasion,
    outfitId: f.outfit_id ? t.aId.outfits.get(f.outfit_id) : undefined,
    prendaIds: traducir(f.prenda_ids, t.aId.prendas),
    marcadasLavar: traducir(f.marcadas_lavar, t.aId.prendas),
  }),
  deseos: (f: FilaDeseo): Omit<Deseo, 'id'> => ({
    uid: f.id,
    descripcion: f.descripcion,
    categoria: f.categoria,
    color: opcional(f.color),
    nota: opcional(f.nota),
  }),
}
