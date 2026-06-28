# ⚽ Quiniela Mundial 2026

App sencilla para que 5 amigos predigan los **playoffs (eliminatorias) del Mundial 2026** y compitan en una tabla de posiciones. Los resultados oficiales se traen **automáticamente** desde [football-data.org] y los puntos se actualizan apenas termina cada partido. Horas en zona **America/Bogotá**, interfaz en **español**.

## ✅ Estado: desplegado y funcionando

- **App en vivo:** https://playoffsworldcup.vercel.app
- **Repo:** https://github.com/drawnick1214/playoffs-worldcup
- **Base de datos:** Supabase (proyecto `playoffs-worldcup`)
- **Sincronización automática:** un job `pg_cron` dentro de Supabase llama a `/api/sync` cada 5 minutos (no se usa servicio externo).

> ⚠️ Pendiente: los 5 jugadores tienen **usuarios/contraseñas de ejemplo** (`jugador1`…`jugador5`, claves `cambiar-1`…`cambiar-5`, `jugador1` es admin). Cámbialos por los reales (ver "Cambiar usuarios/contraseñas" abajo).

## Cómo se puntúa

- **Marcador exacto:** 4 puntos (3 por el marcador + 1 por el resultado).
- **Resultado correcto** (ganador o empate a los 90'): 1 punto.
- Si predices **empate** debes elegir quién gana en penales. Acertar al ganador de penales (cuando el partido realmente va a penales): **+1 punto**.
- Cada predicción se **cierra al iniciar** ese partido. Cuando avanza el torneo, los equipos de la siguiente ronda aparecen solos para predecir.

> Nota: usamos el marcador de tiempo reglamentario/alargue que reporta la API. Un "empate" es exactamente cuando el partido se define por **penales**; si se decide en el alargue hay ganador (no es empate).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind, desplegado en **Vercel** (gratis).
- **Supabase Postgres** (gratis) para usuarios, partidos y predicciones.
- Autenticación propia: usuario + contraseña (bcrypt) y cookie de sesión firmada (JWT).
- Resultados: **football-data.org** (plan gratis, competencia `WC`).

---

## Despliegue paso a paso (gratis)

### 1. Base de datos — Supabase
1. Crea una cuenta en <https://supabase.com> y un **New project** (anota la contraseña de la base).
2. En el proyecto: **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y **Run**.
   - Antes de correrlo, **edita los nombres de usuario, nombres visibles y contraseñas** de los 5 jugadores en el bloque `insert into users ...`. Uno tiene `is_admin = true`.
3. En **Project Settings → API** copia:
   - `Project URL` → será `SUPABASE_URL`
   - `service_role` key (¡secreta!) → será `SUPABASE_SERVICE_ROLE_KEY`

### 2. API de resultados — football-data.org
1. Regístrate gratis en <https://www.football-data.org/client/register>.
2. Confirma tu correo y copia tu **API token** → será `FOOTBALL_DATA_API_KEY`.

### 3. Desplegar en Vercel
1. Sube este repo a GitHub.
2. En <https://vercel.com> → **Add New → Project** → importa el repo.
3. En **Environment Variables** agrega las 5 variables (ver `.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FOOTBALL_DATA_API_KEY`
   - `SESSION_SECRET` → texto largo aleatorio (`openssl rand -hex 32`)
   - `SYNC_TOKEN` → otro texto aleatorio
4. **Deploy**. Tendrás una URL tipo `https://tu-app.vercel.app`.

### 4. Actualización automática de resultados (ya configurada con pg_cron)
En vez de un servicio externo, esta instalación usa **pg_cron + pg_net** dentro de Supabase para llamar `/api/sync` cada 5 minutos. El job ya quedó creado:

```sql
-- Ver el job
select * from cron.job where jobname = 'quiniela-sync';
-- Ver ejecuciones recientes
select * from cron.job_run_details order by start_time desc limit 10;
```

Alternativa (si prefieres un pinger externo): crea un cronjob gratis en <https://cron-job.org> apuntando a
`https://playoffsworldcup.vercel.app/api/sync?token=<SYNC_TOKEN>` cada 5 minutos.

### Cambiar usuarios/contraseñas
En Supabase → **SQL Editor**, por cada jugador:

```sql
update users
set username = 'nombre_real',
    display_name = 'Nombre Visible',
    password_hash = crypt('su-clave', gen_salt('bf', 10))
where username = 'jugador1';
```

### 5. Compartir
Pásale a cada amigo la URL y su **usuario + contraseña**.

---

## Desarrollo local

```bash
cp .env.example .env.local   # y completa los valores
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas de puntuación
```

## Notas operativas

- **Panel admin** (`/admin`, solo el usuario admin): botón para **sincronizar ya** y un formulario para **corregir un resultado a mano** si la API falla o se demora (vuelve a calcular los puntos de ese partido).
- Solo se manejan partidos de **eliminatorias** (octavos/dieciseisavos en adelante); la fase de grupos se ignora.
- Si la competencia `WC` no estuviera disponible en el plan gratis de football-data, la capa `lib/football.ts` puede adaptarse a otra fuente (p. ej. el JSON público de `openfootball/worldcup.json`).

[football-data.org]: https://www.football-data.org
