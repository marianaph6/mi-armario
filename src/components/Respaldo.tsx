import { useRef, useState } from 'react'
import { haceCuanto } from '../lib/fechas'
import { anotarRespaldo, crearRespaldo, entregarArchivo, restaurarRespaldo, ultimoRespaldo } from '../logic/backup'

export function Respaldo() {
  const entrada = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File>()
  const [ocupado, setOcupado] = useState(false)
  const [ultimo, setUltimo] = useState(ultimoRespaldo)
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean }>()

  async function preparar() {
    setOcupado(true)
    setMensaje(undefined)
    try {
      setArchivo(await crearRespaldo())
    } catch {
      setMensaje({ texto: 'No se pudo preparar la copia.', error: true })
    } finally {
      setOcupado(false)
    }
  }

  async function guardar() {
    if (!archivo || !(await entregarArchivo(archivo))) return
    anotarRespaldo()
    setUltimo(new Date())
    setArchivo(undefined)
    setMensaje({ texto: 'Copia lista ✓ Guárdala en Archivos o iCloud.' })
  }

  async function importar(elegido?: File) {
    if (entrada.current) entrada.current.value = ''
    if (!elegido || !confirm('Importar una copia reemplaza TODO lo que hay ahora en la app. ¿Continuar?')) return
    setOcupado(true)
    setMensaje(undefined)
    try {
      const r = await restaurarRespaldo(elegido)
      setMensaje({ texto: `Copia importada ✓ ${r.prendas} prendas y ${r.outfits} outfits.` })
    } catch (e) {
      setMensaje({ texto: (e as Error).message || 'No se pudo importar la copia.', error: true })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="rounded-2xl border border-linea bg-papel p-4">
      <h2 className="font-semibold">Copia de seguridad</h2>
      <p className="mt-1 text-sm text-suave">
        Un archivo con todas tus prendas, fotos y outfits. {ultimo ? `Última copia: ${haceCuanto(ultimo)}.` : 'Aún no has hecho ninguna.'}
      </p>

      <div className="mt-3 flex gap-2">
        {archivo ? (
          <button type="button" onClick={guardar} className="flex-1 rounded-full bg-acento py-3 text-sm font-semibold text-white active:bg-acento-osc">
            Guardar archivo
          </button>
        ) : (
          <button type="button" onClick={preparar} disabled={ocupado} className="flex-1 rounded-full bg-tinta py-3 text-sm font-semibold text-white disabled:opacity-50">
            {ocupado ? 'Trabajando…' : 'Exportar copia'}
          </button>
        )}
        <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className="flex-1 rounded-full border border-tinta py-3 text-sm font-semibold disabled:opacity-50">
          Importar copia
        </button>
      </div>
      <input ref={entrada} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => importar(e.target.files?.[0])} />

      {mensaje && <p className={`mt-3 text-center text-sm ${mensaje.error ? 'text-red-700' : 'text-green-700'}`}>{mensaje.texto}</p>}
    </section>
  )
}
