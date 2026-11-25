# Shipline

Lleva tus proyectos de la idea a publicados. Cada proyecto tiene nombre, idea, color, enlace y
repositorio, y avanza por cuatro estaciones: **idea**, **en desarrollo**, **terminado** y
**publicado**. Una app de [acmsy](https://acmsy.com), pensada para vivir en `shipline.acmsy.com`.

## Cómo funciona

- **Tres pantallas de cuenta con su escena:** entrar (barco en altamar), crear cuenta (barco amarrado al
  muelle) y recuperar (botella con mensaje). Se pasa de una a otra sin recargar con la marea de
  `public/marea.js`: sube el agua con el barco en la cresta, se cambia la pantalla y baja. El mar y el
  barco que navega sobre la ola están en `public/escena.js`.
- **Portada = login.** `/` sin sesión muestra la portada (la que ven los buscadores) con el
  formulario para entrar; con sesión, la misma dirección abre la app.
- **Lista por estación.** Los proyectos se agrupan en idea, en desarrollo, terminado y publicado;
  cada fila muestra solo el color, el nombre y la idea. Al pasar el ratón aparecen el sitio, el
  repositorio y «Mover», que cambia la estación con opción de deshacer.
- **Filtro por estación** arriba, con el conteo de cada una, y búsqueda por nombre o idea
  (atajos: «/» para buscar y «N» para un proyecto nuevo).
- **Panel lateral** para crear y editar (en el celular sube desde abajo); se cierra con la X. Para
  eliminar se mantiene presionado el botón y queda un aviso con «Deshacer».
- Tema claro y oscuro, instalable como app (manifiesto + service worker).

## Arrancar en local

```bash
npm install
cp .env.example .env   # y completa DATABASE_URL y SESSION_SECRET
npm start              # http://localhost:3000 (o el PORT del .env)
```

Necesita PostgreSQL. Las tablas (`auth_users`, `auth_tokens`, `auth_logins` y `proyectos`) se
crean solas al primer uso.

Para cargar los proyectos iniciales en una cuenta:

```bash
npm run sembrar -- tu@correo.com
```

Si la cuenta no existe se crea sin contraseña: se entra con Google (mismo correo) o eligiendo
contraseña desde «Olvidé mi contraseña». No duplica proyectos que ya estén.

## Estructura

| Archivo | Qué hace |
|---|---|
| `server.js` | Express: portada, app, API `/api/proyectos`, SEO y cabeceras de caché |
| `views.js` | HTML de la portada, las pantallas de cuenta y la app (con todos los metadatos) |
| `proyectos.js` | Tabla `proyectos` y validación |
| `shared/auth`, `shared/mailer` | Copia del login y el correo de acmsy (ver abajo) |
| `plantillas/` | `robots.txt`, `sitemap.xml`, `llms.txt`, manifiesto y `sw.js` (con la dirección pública) |
| `public/` | `app.css`, `app.js`, iconos e imagen para compartir |
| `scripts/sembrar.js` | Carga los proyectos iniciales en una cuenta |
| `scripts/render/` | HTML de los iconos y de `og.png` (se renderizan con Edge sin interfaz) |

## API

Todo pide sesión y responde JSON. Lo que modifica exige `Content-Type: application/json`.

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/api/proyectos` | Lista los proyectos de la cuenta |
| `POST` | `/api/proyectos` | Crea uno (`nombre`, `descripcion`, `estado`, `color`, `enlace`, `repo`) |
| `PATCH` | `/api/proyectos/:id` | Cambia los campos que lleguen |
| `DELETE` | `/api/proyectos/:id` | Lo elimina |

## El login es una copia de `Acmsy/shared/auth`, con dos cambios

1. Las pantallas las pone la app (`createAuth({ views })`), para que tengan el diseño de Shipline.
2. **Registrarse con un correo que ya existe falla siempre.** El módulo original le pone
   contraseña a una cuenta que entró con Google sin comprobar que el correo sea de quien se
   registra, y con eso cualquiera puede quedarse con esa cuenta. Para añadir contraseña a una
   cuenta de Google se usa «Olvidé mi contraseña», que sí prueba que el correo es suyo.

## Publicar en acmsy

1. Crear la base: `POST /api/databases` con motor PostgreSQL y nombre `shipline`.
2. Publicar la carpeta con subdominio `shipline`, puerto `3000`, `useAcmsyAuth: true` y las variables
   `DATABASE_URL` (la de `db-shipline`) y `APP_URL=https://shipline.acmsy.com`.
3. Agregar `https://shipline.acmsy.com/auth/google/callback` en el cliente «acmsy web» de Google.
4. Comprobar `https://shipline.acmsy.com/health`, que `sw.js` y el manifiesto salgan con
   `cf-cache-status: BYPASS`, y avisar a los buscadores (IndexNow y Search Console).
