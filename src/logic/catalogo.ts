import type { Categoria, Clima, Ocasion } from '../db/schema'

export const OCASIONES: { id: Ocasion; label: string; emoji: string }[] = [
  { id: 'casa', label: 'Casa', emoji: '🏠' },
  { id: 'gym', label: 'Gym', emoji: '🏋️‍♀️' },
  { id: 'oficina', label: 'Oficina', emoji: '💼' },
  { id: 'salida', label: 'Salida', emoji: '🥂' },
]

export const CATEGORIAS: { id: Categoria; label: string; emoji: string; subtipos: string[] }[] = [
  {
    id: 'superior',
    label: 'Superior',
    emoji: '👚',
    subtipos: ['Camiseta', 'Top', 'Top deportivo', 'Sports bra', 'Blusa', 'Camisa', 'Crop top', 'Body', 'Suéter', 'Buzo'],
  },
  {
    id: 'inferior',
    label: 'Inferior',
    emoji: '👖',
    subtipos: ['Leggings', 'Short deportivo', 'Biker', 'Jogger', 'Jean', 'Pantalón', 'Short', 'Falda'],
  },
  { id: 'enterizo', label: 'Enterizo', emoji: '👗', subtipos: ['Vestido', 'Enterizo', 'Enterizo deportivo', 'Conjunto'] },
  { id: 'calzado', label: 'Calzado', emoji: '👟', subtipos: ['Tenis', 'Tenis deportivos', 'Sandalias', 'Tacones', 'Botas', 'Baletas', 'Mocasines'] },
  { id: 'abrigo', label: 'Abrigo', emoji: '🧥', subtipos: ['Chaqueta', 'Blazer', 'Hoodie', 'Cárdigan', 'Abrigo', 'Chaleco'] },
  { id: 'accesorio', label: 'Accesorio', emoji: '👜', subtipos: ['Bolso', 'Gorra', 'Cinturón', 'Joyería', 'Gafas', 'Bufanda', 'Medias'] },
]

export const CLIMAS: { id: Clima; label: string; emoji: string }[] = [
  { id: 'todo', label: 'Todo clima', emoji: '🌤️' },
  { id: 'calor', label: 'Calor', emoji: '☀️' },
  { id: 'frio', label: 'Frío', emoji: '❄️' },
]

export const COLORES: { id: string; label: string; hex: string; neutro?: boolean }[] = [
  { id: 'negro', label: 'Negro', hex: '#1f1f1f', neutro: true },
  { id: 'blanco', label: 'Blanco', hex: '#ffffff', neutro: true },
  { id: 'gris', label: 'Gris', hex: '#9ca3af', neutro: true },
  { id: 'beige', label: 'Beige', hex: '#dbc8a8', neutro: true },
  { id: 'cafe', label: 'Café', hex: '#7b4b2a', neutro: true },
  { id: 'denim', label: 'Denim', hex: '#5b7fa8', neutro: true },
  { id: 'azul', label: 'Azul', hex: '#2f55c4' },
  { id: 'celeste', label: 'Celeste', hex: '#a9d3f2' },
  { id: 'verde', label: 'Verde', hex: '#3f8f5b' },
  { id: 'oliva', label: 'Oliva', hex: '#7a7d45' },
  { id: 'amarillo', label: 'Amarillo', hex: '#f2cf4a' },
  { id: 'naranja', label: 'Naranja', hex: '#ee8a3c' },
  { id: 'rojo', label: 'Rojo', hex: '#d0352f' },
  { id: 'vinotinto', label: 'Vinotinto', hex: '#7a1f33' },
  { id: 'rosado', label: 'Rosado', hex: '#f2a7c0' },
  { id: 'fucsia', label: 'Fucsia', hex: '#d6297f' },
  { id: 'morado', label: 'Morado', hex: '#7e4bb5' },
  { id: 'lila', label: 'Lila', hex: '#c9b3ea' },
  { id: 'estampado', label: 'Estampado', hex: 'conic-gradient(#f2a7c0, #f2cf4a, #a9d3f2, #3f8f5b, #f2a7c0)' },
]

export const categoriaDe = (id: Categoria) => CATEGORIAS.find((c) => c.id === id)!
export const colorDe = (id: string) => COLORES.find((c) => c.id === id)
