import { createClient, type Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cliente de Supabase, o `null` si la app se compiló sin las claves:
 * en ese caso todo sigue funcionando solo en el teléfono.
 * La clave es la pública (anon); lo que protege los datos son las reglas RLS de supabase/esquema.sql.
 */
export const supabase = url && clave ? createClient(url, clave) : null

/** Sesión actual: `undefined` mientras carga, `null` sin sesión. */
export function useSesion() {
  const [sesion, setSesion] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return sesion
}
