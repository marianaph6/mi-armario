import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { OCASIONES } from '../logic/catalogo'

function Pasos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-linea bg-papel p-4">
      <h2 className="font-semibold">{titulo}</h2>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px]">{children}</ol>
    </section>
  )
}

export function Ayuda() {
  const base = `${location.origin}${location.pathname}`
  const enlaces = [{ label: 'Outfit de hoy', url: `${base}#/hoy` }, ...OCASIONES.map((o) => ({ label: `${o.emoji} ${o.label}`, url: `${base}#/hoy?ocasion=${o.id}` }))]
  const [copiado, setCopiado] = useState<string>()

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(url)
      setTimeout(() => setCopiado(undefined), 2000)
    } catch {
      prompt('Copia esta dirección:', url)
    }
  }

  return (
    <>
      <Link to="/mas" className="-ml-1 text-acento">
        ‹ Más
      </Link>
      <h1 className="mt-1 mb-4 text-3xl font-bold tracking-tight">Instalar y widget</h1>

      <div className="space-y-4">
        <Pasos titulo="1. Instalar en la pantalla de inicio">
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.</li>
          <li>Abre la app desde el ícono nuevo. Desde ahí funciona sin internet.</li>
        </Pasos>

        <p className="rounded-2xl bg-acento-claro p-3 text-sm">
          La app instalada guarda sus datos aparte de Safari. Registra tu ropa siempre desde el ícono, o trae lo que ya tenías con Más → Copia de seguridad.
        </p>

        <Pasos titulo="2. Crear el atajo">
          <li>Copia una de las direcciones de abajo.</li>
          <li>Abre la app <b>Atajos</b> y toca <b>+</b>.</li>
          <li>Busca la acción <b>Abrir URL</b> y pega la dirección.</li>
          <li>Ponle nombre (por ejemplo "Outfit gym") y un ícono, y toca <b>Listo</b>.</li>
        </Pasos>

        <ul className="space-y-2">
          {enlaces.map((e) => (
            <li key={e.url} className="flex items-center gap-3 rounded-2xl border border-linea bg-papel p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.label}</p>
                <p className="truncate text-xs text-suave">{e.url}</p>
              </div>
              <button type="button" onClick={() => copiar(e.url)} className="shrink-0 rounded-full border border-tinta px-3 py-1.5 text-sm font-semibold">
                {copiado === e.url ? 'Copiado ✓' : 'Copiar'}
              </button>
            </li>
          ))}
        </ul>

        <Pasos titulo="3. Poner el widget">
          <li>Mantén presionada la pantalla de inicio y toca <b>Editar</b> → <b>Agregar widget</b>.</li>
          <li>Busca <b>Atajos</b> y elige el tamaño.</li>
          <li>Toca el widget y selecciona tu atajo.</li>
        </Pasos>

        <p className="text-sm text-suave">
          El atajo abre la dirección en Safari, no en la app instalada, y cada una guarda sus datos por separado. Si vas a usar el widget a diario, usa la app siempre desde Safari con el atajo; si prefieres el ícono, úsala solo desde el ícono.
        </p>
      </div>
    </>
  )
}
