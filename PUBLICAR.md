# Cómo se publica Mi Armario

La app está publicada en **GitHub Pages**: https://marianaph6.github.io/mi-armario/

Se publica sola. Cada vez que algo llega a `main`, el workflow [.github/workflows/publicar.yml](.github/workflows/publicar.yml) instala las dependencias, corre las pruebas, genera `dist` y lo sube. Si una prueba falla, no se publica. Puedes seguir el avance en la pestaña **Actions** del repositorio.

Los datos del celular nunca se tocan al actualizar: viven en el iPhone, no en GitHub.

## Después de publicar

1. Abre la dirección en Safari del iPhone.
2. Ve a Más → "Instalar y widget" y sigue los pasos.
3. Si ya registraste ropa en la versión de prueba: allá Más → Exportar copia, y en la publicada Más → Importar copia.

## Publicar a mano (sin GitHub)

La app es estática: basta con subir la carpeta `dist` a cualquier hosting con HTTPS.

```bash
npm run build
npx netlify-cli deploy --prod --dir dist
```
