# Mi Armario

Web app instalable (PWA) para el iPhone que ayuda a variar outfits con la ropa que ya tienes.

- **Clóset con fotos**: superiores, inferiores, enterizos, calzado, abrigos y accesorios.
- **Hoy**: sugiere un outfit para casa, gym, oficina o salida, rotando las prendas que menos usas.
- **Outfits guardados**, sobre todo para el gym.
- **Antes de comprar**: muestra lo que ya tienes parecido para no repetir.
- **Estadísticas**: prendas nunca usadas, las más usadas y cuánto rotaste el clóset.
- **Respaldo**: exporta e importa una copia (.zip) con datos y fotos.

Todos los datos se guardan solo en el teléfono (IndexedDB). No hay servidor ni cuentas.

## Desarrollo

```bash
npm install
npm run dev      # servidor local (también accesible en la red Wi-Fi)
npm test         # pruebas del motor de sugerencias
npm run build    # versión final en dist/
```

Hecho con Vite, React, TypeScript, Tailwind CSS, Dexie y vite-plugin-pwa. Cómo publicarla: [PUBLICAR.md](PUBLICAR.md).
