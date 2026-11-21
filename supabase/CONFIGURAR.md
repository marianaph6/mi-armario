# Configurar Supabase

La nube es opcional: sin estos pasos la app funciona igual, guardando todo en el teléfono.

1. **Proyecto.** Crea una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto en una organización con plan **Free**. Al crearlo:
   - Genera la contraseña de la base de datos y guárdala en tu gestor de contraseñas. La app no la necesita.
   - Deja activado **Enable Data API** y **Enable RLS on new tables automatically**.
   - Deja **desactivado** "Grant API access to new tables automatically": el esquema da acceso solo a usuarios con sesión.
2. **Tablas y permisos.** En **SQL Editor → New query**, pega todo [esquema.sql](esquema.sql) y pulsa **Run**. Supabase avisa de "operaciones destructivas" por los `drop … if exists`; en un proyecto nuevo no borran nada.
3. **Dirección de la app.** En **Authentication → URL Configuration**, pon como **Site URL** la dirección publicada (`https://<usuario>.github.io/mi-armario/`). Ahí vuelven los enlaces de confirmar cuenta y de cambiar contraseña.
4. **Claves de la app.** En **Project Settings → API Keys** copia la **Project URL** y la clave **publishable** (`sb_publishable_…`). Nunca uses la **secret** (`sb_secret_…`) en la app.
   - Para desarrollo local: copia `.env.example` como `.env.local` y pégalas ahí.
   - Para la versión publicada: en GitHub, **Settings → Secrets and variables → Actions → Variables**, crea `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## Cómo se inicia sesión

Con correo y contraseña. Al crear la cuenta llega un correo para confirmarla, y "Olvidé mi contraseña" envía un enlace para elegir otra. Los enlaces abren Safari: la app detecta el regreso y muestra el aviso correspondiente.

Se descartó el código por correo porque el plan gratis no deja editar las plantillas sin un servidor de correo propio, y el enlace mágico abre Safari en vez de la app instalada.

## Límites del plan gratis

Incluye 1 GB de fotos, 500 MB de base de datos y 5 GB de descargas al mes. Si el proyecto pasa una semana sin uso, se pausa; se reactiva desde el panel y los datos se conservan. El correo de fábrica de Supabase envía pocos mensajes por hora y solo a correos de miembros de la organización, que alcanza para uso personal.
