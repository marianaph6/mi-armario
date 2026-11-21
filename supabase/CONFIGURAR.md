# Configurar Supabase

La nube es opcional: sin estos pasos la app funciona igual, guardando todo en el teléfono.

1. **Proyecto.** Crea una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo (por ejemplo `mi-armario`). Elige la región más cercana y guarda la contraseña de la base de datos en tu gestor de contraseñas: la app no la necesita.
2. **Tablas y permisos.** En el proyecto abre **SQL Editor → New query**, pega todo [esquema.sql](esquema.sql) y pulsa **Run**.
3. **Código por correo.** En **Authentication → Emails → Templates**, edita las plantillas **Magic Link** y **Confirm signup** para que el correo muestre el código:

   ```html
   <h2>Tu código para Mi Armario</h2>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Escríbelo en la app. Vence en una hora.</p>
   ```

4. **Claves de la app.** En **Project Settings → API** copia la **Project URL** y la clave pública (**anon** o **publishable**). Nunca uses la clave **service_role** ni la **secret** en la app.
   - Para desarrollo local: copia `.env.example` como `.env.local` y pégalas ahí.
   - Para la versión publicada: en GitHub, **Settings → Secrets and variables → Actions → Variables**, crea `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Límites del plan gratis

Incluye 1 GB de fotos, 500 MB de base de datos y 5 GB de descargas al mes. Si el proyecto pasa una semana sin uso, se pausa; se reactiva desde el panel y los datos se conservan. El correo que trae Supabase de fábrica envía pocos mensajes por hora, que alcanzan para uso personal.
