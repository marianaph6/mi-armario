import JSZip from 'jszip'
import { TABLAS, db, type Deseo, type Outfit, type Prenda, type RegistroUso, type Sincronizable } from '../db/schema'

const APP = 'mi-armario'
const VERSION = 1
const CLAVE_ULTIMO = 'mi-armario:ultimo-respaldo'
export const DIAS_AVISO = 14

type SinFotos<T, K extends keyof T> = Omit<T, K>
interface Datos {
  app: string
  version: number
  exportado: string
  prendas: SinFotos<Prenda, 'foto' | 'miniatura'>[]
  outfits: (SinFotos<Outfit, 'fotoLook'> & { conFoto?: boolean })[]
  usos: RegistroUso[]
  deseos: (SinFotos<Deseo, 'foto'> & { conFoto?: boolean })[]
}

const ruta = {
  prenda: (id: number) => `fotos/prenda-${id}.jpg`,
  mini: (id: number) => `fotos/prenda-${id}-mini.jpg`,
  outfit: (id: number) => `fotos/outfit-${id}.jpg`,
  deseo: (id: number) => `fotos/deseo-${id}.jpg`,
}

/** Empaqueta todo (datos + fotos) en un archivo .zip. */
export async function crearRespaldo(): Promise<File> {
  const [prendas, outfits, usos, deseos] = await Promise.all([db.prendas.toArray(), db.outfits.toArray(), db.usos.toArray(), db.deseos.toArray()])
  const zip = new JSZip()
  const datos: Datos = {
    app: APP,
    version: VERSION,
    exportado: new Date().toISOString(),
    prendas: prendas.map(({ foto, miniatura, ...resto }) => {
      if (foto) zip.file(ruta.prenda(resto.id), foto)
      if (miniatura) zip.file(ruta.mini(resto.id), miniatura)
      return resto
    }),
    outfits: outfits.map(({ fotoLook, ...resto }) => {
      if (fotoLook) zip.file(ruta.outfit(resto.id), fotoLook)
      return { ...resto, conFoto: !!fotoLook }
    }),
    usos,
    deseos: deseos.map(({ foto, ...resto }) => {
      if (foto) zip.file(ruta.deseo(resto.id), foto)
      return { ...resto, conFoto: !!foto }
    }),
  }
  zip.file('datos.json', JSON.stringify(datos))
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  const dia = new Date().toLocaleDateString('sv') // AAAA-MM-DD
  return new File([blob], `mi-armario-${dia}.zip`, { type: 'application/zip' })
}

const fecha = (v: unknown) => (v ? new Date(v as string) : undefined)

/** Reemplaza todo lo que hay en la app por el contenido de una copia. Si la copia no es válida, no cambia nada. */
export async function restaurarRespaldo(archivo: Blob): Promise<{ prendas: number; outfits: number }> {
  let zip: JSZip
  let datos: Datos
  try {
    zip = await JSZip.loadAsync(archivo)
    datos = JSON.parse(await zip.file('datos.json')!.async('string'))
  } catch {
    throw new Error('Ese archivo no es una copia de Mi Armario.')
  }
  if (datos.app !== APP || !Array.isArray(datos.prendas) || !Array.isArray(datos.outfits)) throw new Error('Ese archivo no es una copia de Mi Armario.')
  if (datos.version > VERSION) throw new Error('La copia es de una versión más nueva de la app.')

  const imagen = async (r: string) => {
    const f = zip.file(r)
    return f ? new Blob([await f.async('arraybuffer')], { type: 'image/jpeg' }) : undefined
  }

  const prendas: Prenda[] = []
  for (const p of datos.prendas) {
    const foto = await imagen(ruta.prenda(p.id))
    const miniatura = (await imagen(ruta.mini(p.id))) ?? foto
    prendas.push({ ...p, foto, miniatura, fotoRuta: undefined, miniRuta: undefined, creada: fecha(p.creada) ?? new Date(), ultimoUso: fecha(p.ultimoUso) })
  }
  const outfits: Outfit[] = []
  for (const { conFoto, ...o } of datos.outfits) {
    outfits.push({ ...o, creado: fecha(o.creado) ?? new Date(), ultimoUso: fecha(o.ultimoUso), fotoLook: conFoto ? await imagen(ruta.outfit(o.id)) : undefined })
  }
  const usos = (datos.usos ?? []).map((u) => ({ ...u, fecha: fecha(u.fecha) ?? new Date() }))
  const deseos: Deseo[] = []
  for (const { conFoto, ...d } of datos.deseos ?? []) deseos.push({ ...d, foto: conFoto ? await imagen(ruta.deseo(d.id)) : undefined })

  await db.transaction('rw', ['prendas', 'outfits', 'usos', 'deseos', 'borrados'], async () => {
    // lo que se reemplaza también se borra en la nube (si la copia trae los mismos registros, vuelven a subir)
    for (const t of TABLAS) {
      const uids = (await db.table<Sincronizable>(t).toArray()).flatMap((r) => (r.uid ? [r.uid] : []))
      await db.borrados.bulkPut(uids.map((uid) => ({ tabla: t, uid })))
    }
    await Promise.all([db.prendas.clear(), db.outfits.clear(), db.usos.clear(), db.deseos.clear()])
    await db.prendas.bulkAdd(prendas)
    await db.outfits.bulkAdd(outfits)
    await db.usos.bulkAdd(usos)
    await db.deseos.bulkAdd(deseos)
  })
  return { prendas: prendas.length, outfits: outfits.length }
}

/**
 * Entrega el archivo: en iPhone abre el menú Compartir (para "Guardar en Archivos");
 * en otros navegadores lo descarga. Devuelve false si la persona canceló.
 * Debe llamarse directamente desde un toque, con el archivo ya preparado.
 */
export async function entregarArchivo(archivo: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] })
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
    }
  }
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

export function ultimoRespaldo(): Date | undefined {
  try {
    const v = localStorage.getItem(CLAVE_ULTIMO)
    return v ? new Date(v) : undefined
  } catch {
    return undefined
  }
}

export function anotarRespaldo() {
  try {
    localStorage.setItem(CLAVE_ULTIMO, new Date().toISOString())
  } catch {
    /* sin almacenamiento local: solo se pierde el recordatorio */
  }
}

/** Días sin copia, contando desde la última copia o desde la primera prenda registrada. */
export async function diasSinRespaldo(): Promise<number> {
  const primera = await db.prendas.orderBy('creada').first()
  if (!primera) return 0
  const desde = ultimoRespaldo() ?? primera.creada
  return Math.floor((Date.now() - desde.getTime()) / 86_400_000)
}
