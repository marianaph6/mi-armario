import { useSyncExternalStore } from 'react'
import { alCambiarLocal } from '../db/schema'
import { supabase } from '../lib/supabase'
import { sincronizarCon } from './motor'
import { nubeSupabase } from './nube'

export type Fase = 'apagada' | 'sin-sesion' | 'sincronizando' | 'al-dia' | 'error'

export interface EstadoSync {
  fase: Fase
  ultima?: Date
  error?: string
}

let estado: EstadoSync = { fase: supabase ? 'sin-sesion' : 'apagada' }
const oyentes = new Set<() => void>()

function fijar(cambio: Partial<EstadoSync>) {
  estado = { ...estado, ...cambio }
  oyentes.forEach((f) => f())
}

export function useEstadoSync() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f)
      return () => oyentes.delete(f)
    },
    () => estado,
  )
}

let reloj: ReturnType<typeof setTimeout> | undefined
let corriendo = false
let otraVez = false

/** Pide una sincronización dentro de `ms` (varias peticiones seguidas se juntan en una). */
export function programarSync(ms = 2000) {
  if (!supabase) return
  clearTimeout(reloj)
  reloj = setTimeout(correr, ms)
}

async function correr() {
  if (!supabase) return
  if (corriendo) {
    otraVez = true
    return
  }
  corriendo = true
  try {
    const { data } = await supabase.auth.getSession()
    const usuario = data.session?.user
    if (!usuario) return fijar({ fase: 'sin-sesion', error: undefined })
    if (!navigator.onLine) return fijar({ fase: 'error', error: 'Sin conexión. Se sincroniza sola cuando vuelva internet.' })
    fijar({ fase: 'sincronizando', error: undefined })
    await sincronizarCon(nubeSupabase(supabase, usuario.id), usuario.id)
    fijar({ fase: 'al-dia', ultima: new Date() })
  } catch (e) {
    console.warn('[sync]', e)
    fijar({ fase: 'error', error: 'No se pudo sincronizar. Se vuelve a intentar en un minuto.' })
    programarSync(60_000)
  } finally {
    corriendo = false
    if (otraVez) {
      otraVez = false
      programarSync(500)
    }
  }
}

/** Sincroniza al iniciar sesión, al abrir la app, al volver internet y unos segundos después de cada cambio. */
export function iniciarSync() {
  if (!supabase) return
  alCambiarLocal(() => programarSync(3000))
  supabase.auth.onAuthStateChange((evento, sesion) => {
    if (sesion && (evento === 'SIGNED_IN' || evento === 'INITIAL_SESSION')) programarSync(0)
    if (evento === 'SIGNED_OUT') fijar({ fase: 'sin-sesion', error: undefined })
  })
  addEventListener('online', () => programarSync(0))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') programarSync(0)
  })
}
