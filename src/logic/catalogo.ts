import type { Categoria, Clima, Estado, Ocasion } from '../db/schema'

export const OCASIONES: { id: Ocasion; label: string; emoji: string }[] = [
  { id: 'casa', label: 'Casa', emoji: '🏠' },
  { id: 'gym', label: 'Gym', emoji: '🏋️‍♀️' },
  { id: 'oficina', label: 'Oficina', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '☕' },
  { id: 'salida', label: 'Salida', emoji: '🥂' },
  { id: 'evento', label: 'Evento', emoji: '✨' },
  { id: 'viaje', label: 'Viaje', emoji: '✈️' },
  { id: 'playa', label: 'Playa', emoji: '🏖️' },
]

export const CATEGORIAS: { id: Categoria; label: string; emoji: string; subtipos: string[] }[] = [
  {
    id: 'superior',
    label: 'Superior',
    emoji: '👚',
    subtipos: ['Camiseta', 'Top', 'Top deportivo', 'Sports bra', 'Blusa', 'Camisa', 'Crop top', 'Body', 'Polo', 'Esqueleto', 'Suéter', 'Buzo', 'Corset'],
  },
  {
    id: 'inferior',
    label: 'Inferior',
    emoji: '👖',
    subtipos: ['Leggings', 'Short deportivo', 'Biker', 'Jogger', 'Jean', 'Pantalón', 'Pantalón de vestir', 'Palazzo', 'Cargo', 'Short', 'Falda', 'Falda corta'],
  },
  {
    id: 'enterizo',
    label: 'Enterizo',
    emoji: '👗',
    subtipos: ['Vestido', 'Vestido largo', 'Vestido de fiesta', 'Enterizo', 'Enterizo deportivo', 'Jardinera', 'Conjunto'],
  },
  {
    id: 'calzado',
    label: 'Calzado',
    emoji: '👟',
    subtipos: ['Tenis', 'Tenis deportivos', 'Sandalias', 'Chanclas', 'Tacones', 'Plataformas', 'Botas', 'Botines', 'Baletas', 'Mocasines', 'Pantuflas'],
  },
  {
    id: 'abrigo',
    label: 'Abrigo',
    emoji: '🧥',
    subtipos: ['Chaqueta', 'Chaqueta de jean', 'Chaqueta de cuero', 'Blazer', 'Hoodie', 'Cárdigan', 'Abrigo', 'Gabardina', 'Chaleco', 'Rompevientos'],
  },
  { id: 'bano', label: 'Baño', emoji: '👙', subtipos: ['Bikini', 'Vestido de baño', 'Trikini', 'Salida de baño', 'Pareo'] },
  { id: 'pijama', label: 'Pijama', emoji: '🌙', subtipos: ['Pijama', 'Camisón', 'Bata', 'Short de dormir', 'Pantalón de dormir'] },
  {
    id: 'accesorio',
    label: 'Accesorio',
    emoji: '👜',
    subtipos: ['Bolso', 'Mochila', 'Riñonera', 'Gorra', 'Sombrero', 'Cinturón', 'Collar', 'Aretes', 'Pulsera', 'Reloj', 'Gafas', 'Bufanda', 'Medias', 'Hebilla'],
  },
]

export const CLIMAS: { id: Clima; label: string; emoji: string }[] = [
  { id: 'todo', label: 'Todo clima', emoji: '🌤️' },
  { id: 'calor', label: 'Calor', emoji: '☀️' },
  { id: 'frio', label: 'Frío', emoji: '❄️' },
]

/** Estados de una prenda. Solo `limpia` está disponible para las sugerencias. */
export const ESTADOS: { id: Estado; label: string; corto: string; emoji: string; color: string }[] = [
  { id: 'limpia', label: 'Disponible', corto: 'Disponibles', emoji: '✨', color: '#7aa37e' },
  { id: 'lavar', label: 'Para lavar', corto: 'Por lavar', emoji: '🧺', color: '#6f9bc7' },
  { id: 'arreglar', label: 'Para arreglar', corto: 'Por arreglar', emoji: '🧵', color: '#d9a441' },
  { id: 'donar', label: 'Para donar', corto: 'Para donar', emoji: '🎁', color: '#b8532f' },
  { id: 'botar', label: 'Para botar', corto: 'Para botar', emoji: '🗑️', color: '#8a8580' },
]

export const COLORES: { id: string; label: string; hex: string; neutro?: boolean }[] = [
  { id: 'negro', label: 'Negro', hex: '#1f1f1f', neutro: true },
  { id: 'blanco', label: 'Blanco', hex: '#ffffff', neutro: true },
  { id: 'gris', label: 'Gris', hex: '#9ca3af', neutro: true },
  { id: 'beige', label: 'Beige', hex: '#dbc8a8', neutro: true },
  { id: 'camel', label: 'Camel', hex: '#c19a6b', neutro: true },
  { id: 'cafe', label: 'Café', hex: '#7b4b2a', neutro: true },
  { id: 'denim', label: 'Denim', hex: '#5b7fa8', neutro: true },
  { id: 'azul', label: 'Azul', hex: '#2f55c4' },
  { id: 'celeste', label: 'Celeste', hex: '#a9d3f2' },
  { id: 'menta', label: 'Menta', hex: '#a8dcc5' },
  { id: 'verde', label: 'Verde', hex: '#3f8f5b' },
  { id: 'oliva', label: 'Oliva', hex: '#7a7d45' },
  { id: 'amarillo', label: 'Amarillo', hex: '#f2cf4a' },
  { id: 'mostaza', label: 'Mostaza', hex: '#c9a227' },
  { id: 'naranja', label: 'Naranja', hex: '#ee8a3c' },
  { id: 'terracota', label: 'Terracota', hex: '#c0603e' },
  { id: 'coral', label: 'Coral', hex: '#f08a75' },
  { id: 'rojo', label: 'Rojo', hex: '#d0352f' },
  { id: 'vinotinto', label: 'Vinotinto', hex: '#7a1f33' },
  { id: 'rosado', label: 'Rosado', hex: '#f2a7c0' },
  { id: 'fucsia', label: 'Fucsia', hex: '#d6297f' },
  { id: 'morado', label: 'Morado', hex: '#7e4bb5' },
  { id: 'lila', label: 'Lila', hex: '#c9b3ea' },
  { id: 'dorado', label: 'Dorado', hex: 'linear-gradient(135deg, #b8902f, #f4dc8a, #b8902f)' },
  { id: 'plateado', label: 'Plateado', hex: 'linear-gradient(135deg, #9aa0a6, #eef0f2, #9aa0a6)' },
  { id: 'estampado', label: 'Estampado', hex: 'conic-gradient(#f2a7c0, #f2cf4a, #a9d3f2, #3f8f5b, #f2a7c0)' },
]

/** Busca en el catálogo sin romperse con valores que no conoce (por ejemplo, de una versión más nueva de la app). */
const buscar = <T extends { id: string }>(lista: T[], id: string, otro: T) => lista.find((x) => x.id === id) ?? otro

export const categoriaDe = (id: Categoria) => buscar(CATEGORIAS, id, { id, label: 'Prenda', emoji: '👕', subtipos: [] })
export const ocasionDe = (id: Ocasion) => buscar(OCASIONES, id, { id, label: id, emoji: '•' })
export const estadoDe = (id: Estado) => buscar(ESTADOS, id, ESTADOS[0])
export const colorDe = (id: string) => COLORES.find((c) => c.id === id)

/** Si la prenda se puede usar hoy. */
export const disponible = (p: { estado: Estado }) => p.estado === 'limpia'
/** Si todavía cuenta como parte del clóset (no está de salida). */
export const activa = (p: { estado: Estado }) => p.estado !== 'donar' && p.estado !== 'botar'
