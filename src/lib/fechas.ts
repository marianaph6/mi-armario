export function inicioDeHoy() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** "hoy", "ayer", "hace 5 días"… o "sin estrenar" si nunca se ha usado. */
export function haceCuanto(fecha?: Date) {
  if (!fecha) return 'sin estrenar'
  const dias = Math.floor((inicioDeHoy().getTime() - new Date(fecha).setHours(0, 0, 0, 0)) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 14) return `hace ${dias} días`
  if (dias < 60) return `hace ${Math.floor(dias / 7)} semanas`
  return `hace ${Math.floor(dias / 30)} meses`
}

export const hora = (fecha: Date) => fecha.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })
