import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase, useSesion } from '../lib/supabase'

const campo = 'w-full rounded-xl border border-linea bg-crema px-3 py-3 outline-none focus:border-tinta'
const boton = 'w-full rounded-full bg-acento py-3 font-semibold text-white active:bg-acento-osc disabled:opacity-40'

/** Iniciar sesión con un código que llega al correo (sin contraseña y sin enlaces que abran Safari). */
export function Cuenta() {
  const sesion = useSesion()
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string>()

  async function pedirCodigo(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setOcupado(true)
    setError(undefined)
    const { error } = await supabase.auth.signInWithOtp({ email: correo.trim(), options: { shouldCreateUser: true } })
    setOcupado(false)
    if (error) setError(error.status === 429 ? 'Pediste muchos códigos seguidos. Espera unos minutos.' : 'No se pudo enviar el código. Revisa el correo.')
    else setEnviado(true)
  }

  async function verificar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setOcupado(true)
    setError(undefined)
    const { error } = await supabase.auth.verifyOtp({ email: correo.trim(), token: codigo.trim(), type: 'email' })
    setOcupado(false)
    if (error) setError('El código no es válido o ya venció. Pide uno nuevo.')
  }

  return (
    <>
      <Link to="/mas" className="-ml-2 inline-block px-2 py-2 text-acento">
        ‹ Más
      </Link>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Tu cuenta</h1>
      <p className="mb-5 text-suave">Con una cuenta tu clóset queda guardado en la nube y puedes verlo en otros dispositivos.</p>

      {!supabase ? (
        <p className="rounded-2xl border border-linea bg-papel p-4 text-sm text-suave">Esta versión de la app no tiene la nube configurada. Todo se guarda solo en este teléfono.</p>
      ) : sesion === undefined ? null : sesion ? (
        <section className="space-y-4 rounded-2xl border border-linea bg-papel p-4">
          <div>
            <p className="text-sm text-suave">Sesión iniciada como</p>
            <p className="font-semibold break-all">{sesion.user.email}</p>
          </div>
          <p className="rounded-xl bg-acento-claro p-3 text-sm">
            Muy pronto tus prendas y fotos se sincronizarán solas. Mientras tanto siguen guardadas en este teléfono como siempre.
          </p>
          <button type="button" onClick={() => supabase!.auth.signOut()} className="w-full rounded-full border border-linea py-3 font-semibold active:bg-linea">
            Cerrar sesión
          </button>
        </section>
      ) : !enviado ? (
        <form onSubmit={pedirCodigo} className="space-y-3 rounded-2xl border border-linea bg-papel p-4">
          <label className="block">
            <span className="mb-1 block font-medium">Tu correo</span>
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
          <p className="text-sm text-suave">Te enviaremos un código para entrar. No necesitas contraseña.</p>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={ocupado} className={boton}>
            {ocupado ? 'Enviando…' : 'Enviarme el código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} className="space-y-3 rounded-2xl border border-linea bg-papel p-4">
          <p className="text-sm">
            Escribe el código que llegó a <span className="font-semibold break-all">{correo}</span>. Revisa también la carpeta de spam.
          </p>
          <input
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6,8}"
            maxLength={8}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`${campo} text-center text-2xl tracking-[0.3em]`}
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={ocupado || codigo.length < 6} className={boton}>
            {ocupado ? 'Verificando…' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEnviado(false)
              setCodigo('')
              setError(undefined)
            }}
            className="w-full py-2 text-sm font-medium text-acento"
          >
            Usar otro correo o pedir un código nuevo
          </button>
        </form>
      )}
    </>
  )
}
