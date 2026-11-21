import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { AntesDeComprar } from './pages/AntesDeComprar'
import { Ayuda } from './pages/Ayuda'
import { Closet } from './pages/Closet'
import { Cuenta } from './pages/Cuenta'
import { Historial } from './pages/Historial'
import { Hoy } from './pages/Hoy'
import { Mas } from './pages/Mas'
import { OutfitEditor } from './pages/OutfitEditor'
import { Stats } from './pages/Stats'
import { Outfits } from './pages/Outfits'
import { PrendaForm } from './pages/PrendaForm'
import { RegistroPasado } from './pages/RegistroPasado'

function ConNavegacion() {
  return (
    <>
      <main className="mx-auto min-h-full max-w-lg px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<ConNavegacion />}>
        <Route path="/hoy" element={<Hoy />} />
        <Route path="/closet" element={<Closet />} />
        <Route path="/outfits" element={<Outfits />} />
        <Route path="/mas" element={<Mas />} />
        <Route path="/mas/comprar" element={<AntesDeComprar />} />
        <Route path="/mas/ayuda" element={<Ayuda />} />
        <Route path="/mas/estadisticas" element={<Stats />} />
        <Route path="/mas/historial" element={<Historial />} />
        <Route path="/mas/cuenta" element={<Cuenta />} />
      </Route>
      <Route path="/closet/nueva" element={<PrendaForm />} />
      <Route path="/closet/:id" element={<PrendaForm />} />
      <Route path="/outfits/:id" element={<OutfitEditor />} />
      <Route path="/historial/nuevo" element={<RegistroPasado />} />
      <Route path="*" element={<Navigate to="/hoy" replace />} />
    </Routes>
  )
}
