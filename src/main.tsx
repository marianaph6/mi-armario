import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase'
import { iniciarSync } from './sync/sincronizacion'

// Pide al navegador que no borre los datos guardados (fotos y prendas).
navigator.storage?.persist?.().catch(() => {})

/**
 * Los enlaces de los correos de Supabase (confirmar cuenta, cambiar contraseña) vuelven con
 * `#access_token=…&type=…`, que choca con las rutas `#/…` de la app. Primero dejamos que Supabase
 * lea ese hash y después mandamos a la pantalla de la cuenta con el aviso que corresponda.
 */
async function leerEnlaceDeCorreo() {
  const hash = new URLSearchParams(location.hash.slice(1))
  if (!supabase || !(hash.has('access_token') || hash.has('error_description'))) return
  const tipo = hash.get('type')
  await supabase.auth.getSession()
  const aviso = hash.has('error_description') ? 'enlace-vencido' : tipo === 'recovery' ? 'nueva-clave' : 'confirmado'
  history.replaceState(null, '', `${location.pathname}#/mas/cuenta?aviso=${aviso}`)
}

iniciarSync()

leerEnlaceDeCorreo().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  ),
)
