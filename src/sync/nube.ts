import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilaNube, Nube } from './motor'

/** La nube real: las tablas de supabase/esquema.sql. RLS garantiza que solo se tocan las filas del usuario. */
export function nubeSupabase(cliente: SupabaseClient, usuario: string): Nube {
  return {
    async marcarBorrados(tabla, uids) {
      const { error } = await cliente.from(tabla).update({ borrado: true }).in('id', uids)
      if (error) throw error
    },
    async subir(tabla, filas) {
      const { error } = await cliente.from(tabla).upsert(filas.map((f) => ({ ...f, user_id: usuario })))
      if (error) throw error
    },
    async bajar(tabla, desde, limite) {
      let consulta = cliente.from(tabla).select('*').order('actualizado').order('id').limit(limite)
      // las comillas son necesarias: la fecha lleva ":", "." y "+"
      if (desde) consulta = consulta.or(`actualizado.gt."${desde.actualizado}",and(actualizado.eq."${desde.actualizado}",id.gt.${desde.id})`)
      const { data, error } = await consulta
      if (error) throw error
      return data as FilaNube[]
    },
  }
}
