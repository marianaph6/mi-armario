import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TABLAS, db, type Sincronizable } from '../db/schema'
import { hora } from '../lib/fechas'
import { supabase, useSesion } from '../lib/supabase'
import { programarSync, useEstadoSync } from '../sync/sincronizacion'

const campo = 'w-full rounded-xl border border-linea bg-crema px-3 py-3 outline-none focus:border-tinta'
const boton = 'w-full rounded-full bg-acento py-3 font-semibold text-white active:bg-acento-osc disabled:opacity-40'
const enlace = 'w-full py-2 text-sm font-medium text-acento'

type Modo = 'entrar' | 'crear' | 'olvide'

/** Adonde vuelven los enlaces de los correos: la app publicada, en la misma dirección. */
const volverA = () => `${location.origin}${location.pathname}`

const AVISOS: Record<string, string> = {
  confirmado: 'Tu correo quedó confirmado. Si instalaste la app en la pantalla de inicio, ábrela desde el ícono e inicia sesión ahí.',
  'enlace-vencido': 'El enlace del correo ya no es válido. Pide uno nuevo.',
}

export function Cuenta() {
  const sesion = useSesion()
  const [params, setParams] = useSearchParams()
  const aviso = params.get('aviso')
  const [modo, setModo] = useState<Modo>('entrar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string>()
  const [mensaje, setMensaje] = useState<string>()

  const cambiarModo = (m: Modo) => {
    setModo(m)
    setError(undefined)
    setMensaje(undefined)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setOcupado(true)
    setError(undefined)
    setMensaje(undefined)
    const email = correo.trim()
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
      if (error)
        setError(error.code === 'email_not_confirmed' ? 'Primero confirma tu correo con el enlace que te enviamos.' : 'Correo o contraseña incorrectos.')
    } else if (modo === 'crear') {
      const { data, error } = await supabase.auth.signUp({ email, password: clave, options: { emailRedirectTo: volverA() } })
      if (error) setError(error.code === 'weak_password' ? 'Usa una contraseña más larga o más difícil.' : 'No se pudo crear la cuenta. Revisa el correo.')
      else if (!data.session) setMensaje('Te enviamos un correo para confirmar tu cuenta. Ábrelo, toca el enlace y luego vuelve aquí para entrar.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: volverA() })
      if (error) setError(error.status === 429 ? 'Pediste muchos correos seguidos. Espera unos minutos.' : 'No se pudo enviar el correo.')
      else setMensaje('Si ese correo tiene cuenta, te llegará un enlace para elegir una contraseña nueva.')
    }
    setOcupado(false)
  }

  async function guardarNuevaClave(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setOcupado(true)
    setError(undefined)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setOcupado(false)
    if (error) setError('No se pudo cambiar la contraseña. Prueba con otra más larga.')
    else {
      setClave('')
      setParams({}, { replace: true })
      setMensaje('Contraseña actualizada. Ya puedes usarla para entrar desde la app.')
    }
  }

  return (
    <>
      <Link to="/mas" className="-ml-2 inline-block px-2 py-2 text-acento">
        ‹ Más
      </Link>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Tu cuenta</h1>
      <p className="mb-5 text-suave">Con una cuenta tu clóset queda guardado en la nube y puedes verlo en otros dispositivos.</p>

      {aviso && AVISOS[aviso] && <p className="mb-4 rounded-xl bg-acento-claro p-3 text-sm">{AVISOS[aviso]}</p>}
      {mensaje && <p className="mb-4 rounded-xl bg-acento-claro p-3 text-sm">{mensaje}</p>}

      {!supabase ? (
        <p className="rounded-2xl border border-linea bg-papel p-4 text-sm text-suave">Esta versión de la app no tiene la nube configurada. Todo se guarda solo en este teléfono.</p>
      ) : sesion === undefined ? null : sesion && aviso === 'nueva-clave' ? (
        <form onSubmit={guardarNuevaClave} className="space-y-3 rounded-2xl border border-linea bg-papel p-4">
          <label className="block">
            <span className="mb-1 block font-medium">Contraseña nueva</span>
            <input type="password" required minLength={8} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={campo} />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={ocupado} className={boton}>
            {ocupado ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      ) : sesion ? (
        <section className="space-y-4 rounded-2xl border border-linea bg-papel p-4">
          <div>
            <p className="text-sm text-suave">Sesión iniciada como</p>
            <p className="font-semibold break-all">{sesion.user.email}</p>
          </div>
          <EstadoNube />
          <button type="button" onClick={() => supabase!.auth.signOut()} className="w-full rounded-full border border-linea py-3 font-semibold active:bg-linea">
            Cerrar sesión
          </button>
        </section>
      ) : (
        <form onSubmit={enviar} className="space-y-3 rounded-2xl border border-linea bg-papel p-4">
          <h2 className="font-semibold">{modo === 'entrar' ? 'Iniciar sesión' : modo === 'crear' ? 'Crear cuenta' : 'Recuperar contraseña'}</h2>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className={campo}
            />
          </label>
          {modo !== 'olvide' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Contraseña</span>
              <input
                type="password"
                required
                minLength={modo === 'crear' ? 8 : undefined}
                autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className={campo}
              />
              {modo === 'crear' && <span className="mt-1 block text-xs text-suave">Mínimo 8 caracteres. El iPhone puede sugerirte una y guardarla.</span>}
            </label>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={ocupado} className={boton}>
            {ocupado ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : modo === 'crear' ? 'Crear cuenta' : 'Enviarme el enlace'}
          </button>
          {modo === 'entrar' ? (
            <>
              <button type="button" onClick={() => cambiarModo('crear')} className={enlace}>
                ¿No tienes cuenta? Créala
              </button>
              <button type="button" onClick={() => cambiarModo('olvide')} className={`${enlace} -mt-2`}>
                Olvidé mi contraseña
              </button>
            </>
          ) : (
            <button type="button" onClick={() => cambiarModo('entrar')} className={enlace}>
              Ya tengo cuenta: iniciar sesión
            </button>
          )}
        </form>
      )}
    </>
  )
}

/** Cambios locales que aún no llegan a la nube (incluye eliminaciones). */
async function contarPendientes() {
  let n = await db.borrados.count()
  for (const t of TABLAS) n += await db.table<Sincronizable>(t).filter((r) => (r.cambio ?? 0) > 0).count()
  // fotos que todavía no están en la nube
  n += await db.prendas.filter((p) => !!p.foto && !p.fotoRuta && !((p.cambio ?? 0) > 0)).count()
  return n
}

function EstadoNube() {
  const sync = useEstadoSync()
  const pendientes = useLiveQuery(contarPendientes, []) ?? 0
  const texto =
    sync.fase === 'sincronizando'
      ? 'Sincronizando…'
      : sync.fase === 'error'
        ? sync.error
        : pendientes > 0
          ? `${pendientes === 1 ? '1 cambio' : `${pendientes} cambios`} por subir.`
          : sync.ultima
            ? `Todo guardado en la nube (${hora(sync.ultima)}).`
            : 'Revisando la nube…'
  return (
    <div className="space-y-2 rounded-xl bg-acento-claro p-3 text-sm">
      <p className="flex items-center gap-2">
        <span aria-hidden>{sync.fase === 'error' ? '⚠️' : sync.fase === 'sincronizando' || pendientes > 0 ? '🔄' : '☁️'}</span>
        <span>{texto}</span>
      </p>
      <p className="text-suave">Tus prendas con sus fotos, outfits, historial y lista de deseos se sincronizan solos.</p>
      <button type="button" disabled={sync.fase === 'sincronizando'} onClick={() => programarSync(0)} className="font-semibold text-acento disabled:opacity-40">
        Sincronizar ahora
      </button>
    </div>
  )
}
