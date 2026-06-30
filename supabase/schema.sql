-- Quiniela Mundial 2026 — database schema + seed
-- Run this in the Supabase SQL editor (SQL -> New query -> paste -> Run).
-- pgcrypto gives us gen_random_uuid() and crypt()/gen_salt('bf') so we can store
-- standard bcrypt password hashes that the app (bcryptjs) can verify.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  phone         text unique,                     -- 10 dígitos, empieza por 3 (identificador / login)
  password_hash text not null,
  display_name  text not null,
  is_admin      boolean not null default false,
  approved      boolean not null default false,  -- el admin debe aprobar antes de jugar
  created_at    timestamptz not null default now()
);

create table if not exists matches (
  id             uuid primary key default gen_random_uuid(),
  external_id    text not null unique,           -- football-data.org match id
  stage          text,                            -- LAST_16, QUARTER_FINALS, ...
  round_label    text,                            -- Spanish label shown in UI
  home_team      text,
  away_team      text,
  home_team_code text,
  away_team_code text,
  home_team_crest text,                          -- URL del escudo/bandera
  away_team_crest text,
  kickoff_utc    timestamptz,
  venue          text,                            -- sede/lugar del partido
  status         text,                            -- SCHEDULED/TIMED/IN_PLAY/FINISHED...
  reg_home       int,                             -- regulation (90') goals, home
  reg_away       int,                             -- regulation (90') goals, away
  result         text,                            -- HOME / AWAY / DRAW (at 90')
  drew_at_90     boolean not null default false,  -- empate al 90' (definido en prórroga o penales)
  advance_winner text,                            -- HOME / AWAY (equipo que avanzó la llave)
  scored         boolean not null default false,  -- points already distributed
  result_locked  boolean not null default false,  -- admin fijó el resultado a mano (sync no lo toca)
  updated_at     timestamptz not null default now()
);

create table if not exists predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  match_id        uuid not null references matches(id) on delete cascade,
  pred_home           int not null,
  pred_away           int not null,
  pred_advance_winner text,                       -- HOME / AWAY (requerido si predice empate)
  points              int,                        -- null until the match is scored
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists predictions_match_idx on predictions(match_id);
create index if not exists predictions_user_idx  on predictions(user_id);

-- ---------------------------------------------------------------------------
-- No seed users: players self-register from the app's "Crear cuenta" screen.
-- The FIRST person to register automatically becomes the admin.
--
-- To grant admin to someone else later:
--   update users set is_admin = true where phone = '3001234567';
-- To reset a password manually:
--   update users set password_hash = crypt('nueva-clave', gen_salt('bf', 10))
--   where phone = '3001234567';
-- ---------------------------------------------------------------------------
