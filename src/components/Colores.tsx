import { COLORES } from '../logic/catalogo'

export function Colores({ seleccion, onToggle }: { seleccion: readonly string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLORES.map((c) => {
        const activo = seleccion.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            aria-label={c.label}
            aria-pressed={activo}
            title={c.label}
            onClick={() => onToggle(c.id)}
            className={`h-10 w-10 rounded-full border border-black/10 transition-shadow ${activo ? 'ring-2 ring-tinta ring-offset-2 ring-offset-crema' : ''}`}
            style={{ background: c.hex }}
          />
        )
      })}
    </div>
  )
}
