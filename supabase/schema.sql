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
  username      text not null unique,
  password_hash text not null,
  display_name  text not null,
  is_admin      boolean not null default false,
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
  kickoff_utc    timestamptz,
  status         text,                            -- SCHEDULED/TIMED/IN_PLAY/FINISHED...
  reg_home       int,                             -- regulation (90') goals, home
  reg_away       int,                             -- regulation (90') goals, away
  result         text,                            -- HOME / AWAY / DRAW (at 90')
  went_to_pens   boolean not null default false,
  pen_winner     text,                            -- HOME / AWAY (shootout winner)
  scored         boolean not null default false,  -- points already distributed
  updated_at     timestamptz not null default now()
);

create table if not exists predictions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  match_id        uuid not null references matches(id) on delete cascade,
  pred_home       int not null,
  pred_away       int not null,
  pred_pen_winner text,                           -- HOME / AWAY (required if a tie)
  points          int,                            -- null until the match is scored
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists predictions_match_idx on predictions(match_id);
create index if not exists predictions_user_idx  on predictions(user_id);

-- ---------------------------------------------------------------------------
-- Seed the 5 players. EDIT the usernames, display names and passwords below.
-- The password is the 2nd argument to crypt(). Re-running is safe (on conflict).
-- ---------------------------------------------------------------------------

-- One of the 5 players is also the admin (is_admin = true) so they can fix a
-- result manually if the API ever fails. They still play and appear on the board.
insert into users (username, display_name, password_hash, is_admin) values
  ('jugador1', 'Jugador 1', crypt('cambiar-1', gen_salt('bf', 10)), true),
  ('jugador2', 'Jugador 2', crypt('cambiar-2', gen_salt('bf', 10)), false),
  ('jugador3', 'Jugador 3', crypt('cambiar-3', gen_salt('bf', 10)), false),
  ('jugador4', 'Jugador 4', crypt('cambiar-4', gen_salt('bf', 10)), false),
  ('jugador5', 'Jugador 5', crypt('cambiar-5', gen_salt('bf', 10)), false)
on conflict (username) do nothing;

-- To change a password later:
--   update users set password_hash = crypt('nueva-clave', gen_salt('bf', 10))
--   where username = 'jugador1';
