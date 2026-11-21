import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Respaldo } from '../components/Respaldo'

export function Mas() {
  const [protegido, setProtegido] = useState<boolean>()
  const [usoMb, setUsoMb] = useState<number>()

  useEffect(() => {
    navigator.storage?.persisted?.().then(setProtegido)
    navigator.storage?.estimate?.().then((e) => setUsoMb((e.usage ?? 0) / 1024 / 1024))
  }, [])

  return (
    <>
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Más</h1>

      <nav className="mb-4 space-y-3">
        {[
          { to: '/mas/comprar', emoji: '🛍️', titulo: 'Antes de comprar', texto: 'Revisa si ya tienes algo parecido y tu lista de deseos.' },
          { to: '/mas/cuenta', emoji: '☁️', titulo: 'Tu cuenta', texto: 'Guarda tu clóset en la nube y úsalo en otros dispositivos.' },
          { to: '/mas/historial', emoji: '🗓️', titulo: 'Historial', texto: 'Lo que te pusiste cada día. Registra también días pasados.' },
          { to: '/mas/estadisticas', emoji: '📊', titulo: 'Estadísticas', texto: 'Qué usas, qué tienes olvidado y qué sigue sin estrenar.' },
          { to: '/mas/ayuda', emoji: '📲', titulo: 'Instalar y widget', texto: 'Cómo ponerla en tu pantalla de inicio y crear el atajo.' },
        ].map((x) => (
          <Link key={x.to} to={x.to} className="flex items-center gap-3 rounded-2xl border border-linea bg-papel p-4 active:bg-linea">
            <span className="text-3xl">{x.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{x.titulo}</span>
              <span className="block text-sm text-suave">{x.texto}</span>
            </span>
            <span className="text-xl text-suave">›</span>
          </Link>
        ))}
      </nav>

      <section className="rounded-2xl border border-linea bg-papel p-4">
        <h2 className="font-semibold">Tus datos</h2>
        <p className="mt-1 text-sm text-suave">Las prendas y fotos se guardan en este celular y, si inicias sesión en Tu cuenta, también en tu nube privada.</p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-suave">Espacio usado</dt>
            <dd>{usoMb === undefined ? '…' : `${usoMb.toFixed(1)} MB`}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-suave">Protección contra borrado</dt>
            <dd>{protegido === undefined ? '…' : protegido ? 'Activa' : 'No activa'}</dd>
          </div>
        </dl>
        {protegido === false && (
          <p className="mt-3 rounded-xl bg-acento-claro p-3 text-sm">
            Para proteger tus datos, instala la app: en Safari toca Compartir y luego "Agregar a pantalla de inicio".
          </p>
        )}
      </section>

      <div className="mt-4">
        <Respaldo />
      </div>
    </>
  )
}
