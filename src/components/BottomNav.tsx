import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const icono = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

const TABS = [
  { to: '/hoy', label: 'Hoy', icono: icono(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>) },
  { to: '/closet', label: 'Clóset', icono: icono(<><path d="M12 8.5 3 15.5a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8L12 8.5Zm0 0V7a2.2 2.2 0 1 0-2.2-2.2" /></>) },
  { to: '/outfits', label: 'Outfits', icono: icono(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>) },
  { to: '/mas', label: 'Más', icono: icono(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>) },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium ${isActive ? 'text-acento' : 'text-suave'}`
            }
          >
            {t.icono}
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
