interface Opcion<T extends string> {
  id: T
  label: string
  emoji?: string
}

interface Props<T extends string> {
  opciones: readonly Opcion<T>[]
  seleccion: readonly T[]
  onToggle: (id: T) => void
  /** una sola fila con desplazamiento horizontal (para filtros) */
  enFila?: boolean
  tamano?: 'sm' | 'md'
}

export function Chips<T extends string>({ opciones, seleccion, onToggle, enFila, tamano = 'md' }: Props<T>) {
  return (
    <div className={enFila ? 'sin-barra -mx-4 flex gap-2 overflow-x-auto px-4' : 'flex flex-wrap gap-2'}>
      {opciones.map((o) => {
        const activo = seleccion.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onToggle(o.id)}
            className={`shrink-0 rounded-full border font-medium whitespace-nowrap transition-colors ${
              tamano === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-[15px]'
            } ${activo ? 'border-tinta bg-tinta text-white' : 'border-linea bg-papel text-tinta active:bg-linea'}`}
          >
            {o.emoji && <span className="mr-1.5">{o.emoji}</span>}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
