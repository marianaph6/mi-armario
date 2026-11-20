# Cómo publicar Mi Armario

La app es estática: basta con subir la carpeta `dist` a cualquier hosting con HTTPS.

## Opción más simple: Netlify (gratis)

1. Genera la versión final:

   ```bash
   npm run build
   ```

2. Publica (la primera vez abre el navegador para iniciar sesión o crear la cuenta):

   ```bash
   npx netlify-cli deploy --prod --dir dist
   ```

3. Al terminar muestra la dirección pública (algo como `https://mi-armario.netlify.app`).

Sin terminal: entra a https://app.netlify.com/drop y arrastra la carpeta `dist`.

## Alternativa: Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name mi-armario
```

## Después de publicar

1. Abre la dirección en Safari del iPhone.
2. Ve a Más → "Instalar y widget" y sigue los pasos.
3. Si ya registraste ropa en la versión de prueba: allá Más → Exportar copia, y en la publicada Más → Importar copia.

## Para actualizar la app

Repite `npm run build` y el comando de publicación. Los datos del celular no se tocan.
