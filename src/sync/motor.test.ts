import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, sinMarcarCambios, type Prenda, type TablaSync } from '../db/schema'
import type { Fila } from './mapeo'
import { sincronizarCon, type Cursor, type FilaNube, type Nube } from './motor'

/** Servidor simulado: como en Postgres, todas las filas de una misma escritura llevan la misma hora. */
class NubeFalsa implements Nube {
  tablas = new Map<TablaSync, Map<string, FilaNube>>()
  private reloj = 0
  private sello = () => new Date(Date.UTC(2026, 0, 1) + ++this.reloj).toISOString()
  tabla = (t: TablaSync) => this.tablas.get(t) ?? this.tablas.set(t, new Map()).get(t)!

  async marcarBorrados(t: TablaSync, uids: string[]) {
    const s = this.sello()
    for (const uid of uids) {
      const f = this.tabla(t).get(uid)
      if (f) this.tabla(t).set(uid, { ...f, borrado: true, actualizado: s })
    }
  }
  async subir(t: TablaSync, filas: Fila[]) {
    const s = this.sello()
    for (const f of filas) this.tabla(t).set(f.id, { ...this.tabla(t).get(f.id), ...f, actualizado: s } as FilaNube)
  }
  archivos = new Map<string, Blob>()
  async subirFoto(ruta: string, foto: Blob) {
    this.archivos.set(ruta, foto)
  }
  async fijarFotos(uid: string, fotoRuta: string, miniRuta: string) {
    const f = this.tabla('prendas').get(uid)
    if (!f) return false
    this.tabla('prendas').set(uid, { ...f, foto_path: fotoRuta, miniatura_path: miniRuta, actualizado: this.sello() } as FilaNube)
    return true
  }
  async bajarFoto(ruta: string) {
    const f = this.archivos.get(ruta)
    if (!f) throw new Error(`no existe ${ruta}`)
    return f
  }
  async limpiarFotos(carpeta: string, conservar: string[]) {
    for (const r of [...this.archivos.keys()]) if (r.startsWith(`${carpeta}/`) && !conservar.includes(r)) this.archivos.delete(r)
  }
  async bajar(t: TablaSync, desde: Cursor | undefined, limite: number) {
    const despues = (f: FilaNube) => !desde || f.actualizado > desde.actualizado || (f.actualizado === desde.actualizado && f.id > desde.id)
    return [...this.tabla(t).values()]
      .filter(despues)
      .sort((a, b) => a.actualizado.localeCompare(b.actualizado) || a.id.localeCompare(b.id))
      .slice(0, limite)
  }
}

const prenda = (nombre: string): Omit<Prenda, 'id'> => ({
  nombre,
  categoria: 'superior',
  colores: ['negro'],
  ocasiones: ['gym'],
  clima: 'todo',
  estado: 'limpia',
  usos: 0,
  creada: new Date('2026-11-01'),
})

/** Simula abrir la app en otro teléfono: base local vacía, misma nube. */
async function otroDispositivo() {
  await db.delete()
  await db.open()
}

const pendientes = async () => (await db.prendas.toArray()).filter((p) => (p.cambio ?? 0) > 0).length

let nube: NubeFalsa
beforeEach(async () => {
  nube = new NubeFalsa()
  await otroDispositivo()
})

describe('sincronizarCon', () => {
  it('sube prendas y outfits con las referencias traducidas a uid', async () => {
    const top = await db.prendas.add(prenda('Top'))
    const leggings = await db.prendas.add({ ...prenda('Leggings'), categoria: 'inferior' })
    const outfit = await db.outfits.add({ prendaIds: [top, leggings], ocasion: 'gym', favorito: true, creado: new Date(), usos: 0 })
    expect(await pendientes()).toBe(2)

    await sincronizarCon(nube, 'u1')

    const uidTop = (await db.prendas.get(top))!.uid!
    const filaOutfit = nube.tabla('outfits').get((await db.outfits.get(outfit))!.uid!)!
    expect(filaOutfit).toMatchObject({ favorito: true, borrado: false })
    expect('prenda_ids' in filaOutfit && filaOutfit.prenda_ids).toContain(uidTop)
    expect(await pendientes()).toBe(0)
  })

  it('en otro dispositivo reconstruye el clóset con sus enlaces', async () => {
    const top = await db.prendas.add(prenda('Top'))
    const outfit = await db.outfits.add({ prendaIds: [top], ocasion: 'gym', favorito: false, creado: new Date(), usos: 1 })
    await db.usos.add({ fecha: new Date('2026-11-10'), ocasion: 'gym', outfitId: outfit, prendaIds: [top], marcadasLavar: [top] })
    await sincronizarCon(nube, 'u1')

    await otroDispositivo()
    await sincronizarCon(nube, 'u1')

    const [p] = await db.prendas.toArray()
    const [o] = await db.outfits.toArray()
    const [u] = await db.usos.toArray()
    expect(p.nombre).toBe('Top')
    expect(p.foto).toBeUndefined() // las fotos llegan en la fase 3
    expect(o.prendaIds).toEqual([p.id])
    expect(u).toMatchObject({ outfitId: o.id, prendaIds: [p.id], marcadasLavar: [p.id] })
    expect(p.cambio).toBe(0) // lo que bajó no se vuelve a subir
  })

  it('una eliminación llega a los otros dispositivos', async () => {
    const id = await db.deseos.add({ descripcion: 'Tenis blancos', categoria: 'calzado' })
    await sincronizarCon(nube, 'u1')
    await otroDispositivo()
    await sincronizarCon(nube, 'u1')
    expect(await db.deseos.count()).toBe(1)

    await db.deseos.delete((await db.deseos.toArray())[0].id)
    await new Promise((r) => setTimeout(r, 0)) // el aviso de borrado se guarda al cerrar la transacción
    await sincronizarCon(nube, 'u1')
    expect([...nube.tabla('deseos').values()][0].borrado).toBe(true)
    expect(id).toBeGreaterThan(0)
  })

  it('un cambio local pendiente no se pisa con lo que viene de la nube', async () => {
    const id = await db.prendas.add(prenda('Top'))
    await sincronizarCon(nube, 'u1')
    const uid = (await db.prendas.get(id))!.uid!
    // otro dispositivo la cambia en la nube...
    await nube.subir('prendas', [{ ...nube.tabla('prendas').get(uid)!, nombre: 'Cambio remoto' }])
    // ...mientras aquí también se cambió y aún no se sube
    await db.prendas.update(id, { nombre: 'Cambio local' })

    await sincronizarCon(nube, 'u1')
    expect((await db.prendas.get(id))!.nombre).toBe('Cambio local')
    expect(nube.tabla('prendas').get(uid)).toMatchObject({ nombre: 'Cambio local' })
  })

  it('un cambio hecho mientras sincroniza no se pisa y se sube en la siguiente vuelta', async () => {
    const id = await db.prendas.add(prenda('Top'))
    await sincronizarCon(nube, 'u1')
    const uid = (await db.prendas.get(id))!.uid!
    await nube.subir('prendas', [{ ...nube.tabla('prendas').get(uid)!, nombre: 'Cambio remoto' }])

    // justo después de subir y antes de bajar, la persona edita la prenda
    const bajar = nube.bajar.bind(nube)
    let editada = false
    nube.bajar = async (...args) => {
      if (!editada) {
        editada = true
        await db.prendas.update(id, { nombre: 'Editada durante la sync' })
      }
      return bajar(...args)
    }
    await sincronizarCon(nube, 'u1')
    expect((await db.prendas.get(id))!.nombre).toBe('Editada durante la sync')

    await sincronizarCon(nube, 'u1')
    expect(nube.tabla('prendas').get(uid)).toMatchObject({ nombre: 'Editada durante la sync' })
  })

  it('un cambio hecho mientras se sube queda pendiente', async () => {
    const id = await db.prendas.add(prenda('Top'))
    const subir = nube.subir.bind(nube)
    let editada = false
    nube.subir = async (...args) => {
      await subir(...args)
      if (!editada) {
        editada = true
        await new Promise((r) => setTimeout(r, 2)) // otra hora para el cambio
        await db.prendas.update(id, { nombre: 'Editada mientras subía' })
      }
    }
    await sincronizarCon(nube, 'u1')
    expect(await pendientes()).toBe(1)
    await sincronizarCon(nube, 'u1')
    expect(nube.tabla('prendas').get((await db.prendas.get(id))!.uid!)).toMatchObject({ nombre: 'Editada mientras subía' })
  })

  it('baja todo aunque muchas filas compartan la misma hora', async () => {
    await db.deseos.bulkAdd(Array.from({ length: 23 }, (_, i) => ({ descripcion: `Deseo ${i}`, categoria: 'accesorio' as const })))
    await sincronizarCon(nube, 'u1', 5) // una sola subida: las 23 filas con la misma hora
    await otroDispositivo()
    await sincronizarCon(nube, 'u1', 5)
    expect(await db.deseos.count()).toBe(23)
  })

  describe('fotos', () => {
    const fotos = (texto: string) => ({ foto: new Blob([`${texto} grande`], { type: 'image/jpeg' }), miniatura: new Blob([`${texto} mini`], { type: 'image/jpeg' }) })
    const deLaPrenda = (uid: string) => [...nube.archivos.keys()].filter((r) => r.startsWith(`u1/prendas/${uid}/`)).sort()

    it('sube la foto y la fila guarda dónde quedó', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('top') })
      await sincronizarCon(nube, 'u1')
      const p = (await db.prendas.get(id))!
      const fila = nube.tabla('prendas').get(p.uid!)!
      expect('foto_path' in fila && fila.foto_path).toBe(p.fotoRuta)
      expect(deLaPrenda(p.uid!)).toEqual([p.fotoRuta, p.miniRuta].sort())
      expect(p.cambio).toBe(0)
    })

    it('en otro dispositivo baja las fotos', async () => {
      await db.prendas.add({ ...prenda('Top'), ...fotos('top') })
      await sincronizarCon(nube, 'u1')
      await otroDispositivo()
      await sincronizarCon(nube, 'u1')
      const [p] = await db.prendas.toArray()
      expect(await p.miniatura!.text()).toBe('top mini')
      expect(await p.foto!.text()).toBe('top grande')
      expect(p.cambio).toBe(0)
    })

    it('al cambiar la foto sube la nueva, borra la vieja y los otros dispositivos la reemplazan', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('vieja') })
      await sincronizarCon(nube, 'u1')
      const uid = (await db.prendas.get(id))!.uid!
      const rutaVieja = (await db.prendas.get(id))!.fotoRuta
      // el otro dispositivo ya la tenía
      const copia = await db.prendas.get(id)

      await db.prendas.update(id, fotos('nueva'))
      expect((await db.prendas.get(id))!.fotoRuta).toBeUndefined()
      await sincronizarCon(nube, 'u1')
      const nueva = (await db.prendas.get(id))!
      expect(nueva.fotoRuta).not.toBe(rutaVieja)
      expect(deLaPrenda(uid)).toEqual([nueva.fotoRuta, nueva.miniRuta].sort())

      await otroDispositivo()
      await sinMarcarCambios(() => db.prendas.add({ ...copia!, cambio: 0 })) // la versión vieja, con su foto vieja
      await sincronizarCon(nube, 'u1')
      expect(await (await db.prendas.get(id))!.foto!.text()).toBe('nueva grande')
    })

    it('editar el nombre en un dispositivo con la foto vieja no borra la foto nueva', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('vieja') })
      await sincronizarCon(nube, 'u1')
      const vieja = (await db.prendas.get(id))!
      await db.prendas.update(id, fotos('nueva'))
      await sincronizarCon(nube, 'u1')
      const rutaNueva = (await db.prendas.get(id))!.fotoRuta

      // otro dispositivo, que aún tiene la foto vieja, cambia el nombre antes de enterarse
      await otroDispositivo()
      await sinMarcarCambios(() => db.prendas.add({ ...vieja, cambio: 0 }))
      await db.prendas.update(id, { nombre: 'Top de correr' })
      await sincronizarCon(nube, 'u1')

      const fila = nube.tabla('prendas').get(vieja.uid!)!
      expect(fila).toMatchObject({ nombre: 'Top de correr', foto_path: rutaNueva })
      expect(nube.archivos.has(rutaNueva!)).toBe(true)
      expect(await (await db.prendas.get(id))!.foto!.text()).toBe('nueva grande')
    })

    it('editar otros datos no vuelve a subir la foto', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('top') })
      await sincronizarCon(nube, 'u1')
      const ruta = (await db.prendas.get(id))!.fotoRuta
      await db.prendas.update(id, { nombre: 'Top negro' })
      await sincronizarCon(nube, 'u1')
      expect((await db.prendas.get(id))!.fotoRuta).toBe(ruta)
    })

    it('al eliminar la prenda borra sus fotos de la nube', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('top') })
      await sincronizarCon(nube, 'u1')
      const uid = (await db.prendas.get(id))!.uid!
      await db.prendas.delete(id)
      await new Promise((r) => setTimeout(r, 0))
      await sincronizarCon(nube, 'u1')
      expect(deLaPrenda(uid)).toEqual([])
    })

    it('sube las fotos de prendas que ya estaban sincronizadas sin foto (fase 2)', async () => {
      const id = await db.prendas.add({ ...prenda('Top'), ...fotos('top') })
      await sincronizarCon(nube, 'u1')
      // como quedó tras la fase 2: sincronizada pero sin ruta de foto
      await db.prendas.update(id, { fotoRuta: undefined, miniRuta: undefined, cambio: 0 })
      nube.archivos.clear()
      await sincronizarCon(nube, 'u1')
      expect((await db.prendas.get(id))!.fotoRuta).toBeTruthy()
      expect(nube.archivos.size).toBe(2)
    })
  })
})
