import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBogota, isLocked } from "@/lib/time";
import { STAGE_ORDER, stageLabel } from "@/lib/football";
import type { Match, Prediction } from "@/lib/types";
import PredictionForm from "@/components/PredictionForm";
import LogoutButton from "@/components/LogoutButton";
import TeamName from "@/components/TeamName";
import PredictionsList, { type RevealRow } from "@/components/PredictionsList";

export const dynamic = "force-dynamic";

function teamName(n: string | null): string {
  return n && n.trim() ? n : "Por definir";
}

export default async function HomePage() {
  const user = await requireUser();
  const supabase = db();

  const [{ data: matchesRaw }, { data: usersRaw }, { data: allPredsRaw }] = await Promise.all([
    supabase.from("matches").select("*"),
    supabase.from("users").select("id, display_name"),
    supabase.from("predictions").select("*"),
  ]);

  const matches = (matchesRaw ?? []) as Match[];
  const users = (usersRaw ?? []) as { id: string; display_name: string }[];
  const allPreds = (allPredsRaw ?? []) as Prediction[];

  const nameById = new Map<string, string>();
  for (const u of users) nameById.set(u.id, u.display_name);

  // ----- Leaderboard -----
  const totals = new Map<string, number>();
  for (const u of users) totals.set(u.id, 0);
  for (const p of allPreds) {
    if (p.points != null) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.points);
  }
  const leaderboard = users
    .map((u) => ({ ...u, points: totals.get(u.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name));

  // ----- Predictions indexed by match -----
  const predByMatch = new Map<string, Prediction>(); // my own
  const allByMatch = new Map<string, Prediction[]>(); // everyone (revealed only after kickoff)
  for (const p of allPreds) {
    if (p.user_id === user.id) predByMatch.set(p.match_id, p);
    const list = allByMatch.get(p.match_id) ?? [];
    list.push(p);
    allByMatch.set(p.match_id, list);
  }

  // ----- Group matches by stage, sorted -----
  const sorted = [...matches].sort((a, b) => {
    const sa = STAGE_ORDER[a.stage ?? ""] ?? 99;
    const sb = STAGE_ORDER[b.stage ?? ""] ?? 99;
    if (sa !== sb) return sa - sb;
    const ka = a.kickoff_utc ? new Date(a.kickoff_utc).getTime() : Infinity;
    const kb = b.kickoff_utc ? new Date(b.kickoff_utc).getTime() : Infinity;
    return ka - kb;
  });

  const groups: { stage: string; label: string; matches: Match[] }[] = [];
  for (const m of sorted) {
    const stage = m.stage ?? "OTROS";
    let g = groups.find((x) => x.stage === stage);
    if (!g) {
      g = { stage, label: stageLabel(m.stage), matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black uppercase leading-tight tracking-tight drop-shadow sm:text-2xl">
            ⚽ Polla Playoffs <span className="text-amber-300">del Mundial</span>
          </h1>
          <p className="text-sm text-white/80">Hola, {user.display_name} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          {user.is_admin && (
            <Link
              href="/admin"
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
            >
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Leaderboard */}
      <section className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-md">
        <h2 className="mb-3 text-lg font-black uppercase tracking-wide text-amber-300">
          🏆 Tabla de posiciones
        </h2>
        {leaderboard.length === 0 ? (
          <p className="px-1 text-sm text-white/70">
            Aún no hay jugadores. Comparte el enlace para que se registren.
          </p>
        ) : (
          <ol className="space-y-1">
            {leaderboard.map((u, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <li
                  key={u.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    u.id === user.id ? "bg-amber-400/25 ring-1 ring-amber-300/40" : ""
                  }`}
                >
                  <span className="flex items-center font-semibold">
                    <span className="mr-2 inline-block w-6 text-center text-white/70">
                      {medal ?? `${i + 1}.`}
                    </span>
                    {u.display_name}
                    {u.id === user.id && <span className="ml-2 text-xs text-amber-200">(tú)</span>}
                  </span>
                  <span className="font-black text-amber-300">{u.points} pts</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Rules */}
      <details className="mb-6 rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white/80 backdrop-blur">
        <summary className="cursor-pointer font-bold text-white">¿Cómo se puntúa?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Marcador exacto: <strong>4 puntos</strong></li>
          <li>Resultado correcto (ganador o empate): <strong>1 punto</strong></li>
          <li>Si predices empate, elige quién gana en penales. Acertar el ganador de penales: <strong>+1 punto</strong></li>
          <li>Cada predicción se cierra cuando inicia el partido.</li>
        </ul>
      </details>

      <p className="mb-4 text-center text-xs text-white/70">
        🕐 Todos los horarios están en hora de Colombia 🇨🇴
      </p>

      {/* Matches */}
      {groups.length === 0 && (
        <p className="rounded-xl border border-white/20 bg-white/10 p-6 text-center text-white/80 backdrop-blur">
          Todavía no hay partidos de playoffs disponibles. Vuelve pronto.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.stage} className="mb-8">
          <h2 className="mb-3 inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-black uppercase tracking-wider text-white shadow">
            {g.label}
          </h2>
          <div className="space-y-3">
            {g.matches.map((m) => {
              const pred = predByMatch.get(m.id);
              const teamsKnown = !!(m.home_team && m.away_team);
              const finished = m.status === "FINISHED";
              const locked = isLocked(m.kickoff_utc);
              const predictable = teamsKnown && !locked && !finished;

              // Reveal everyone's predictions only once the match is locked (kickoff passed).
              const revealRows: RevealRow[] =
                locked || finished
                  ? (allByMatch.get(m.id) ?? []).map((p) => ({
                      name: nameById.get(p.user_id) ?? "Jugador",
                      home: p.pred_home,
                      away: p.pred_away,
                      penWinner: p.pred_pen_winner,
                      points: p.points,
                      isMe: p.user_id === user.id,
                    }))
                  : [];

              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md transition hover:bg-white/15"
                >
                  <div className="flex items-start justify-between gap-2 text-xs text-white/70">
                    <span className="flex flex-col gap-0.5">
                      <span>🕐 {formatBogota(m.kickoff_utc)}</span>
                      {m.venue && <span className="text-white/60">📍 {m.venue}</span>}
                    </span>
                    {finished ? (
                      <span className="shrink-0 rounded-full bg-emerald-400/20 px-2 py-0.5 font-bold text-emerald-200">
                        Finalizado
                      </span>
                    ) : locked && teamsKnown ? (
                      <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 font-bold text-amber-200">
                        Cerrado
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-2 text-base font-bold">
                    <TeamName name={teamName(m.home_team)} crest={m.home_team_crest} />
                    <span className="text-xs font-normal text-white/50">vs</span>
                    <TeamName name={teamName(m.away_team)} crest={m.away_team_crest} reverse />
                  </div>

                  {/* Finished: real result + my prediction + points */}
                  {finished && (
                    <div className="mt-2 text-center">
                      <div className="text-3xl font-black text-amber-300 drop-shadow">
                        {m.reg_home} - {m.reg_away}
                      </div>
                      {m.went_to_pens && (
                        <div className="text-xs text-amber-200">
                          Penales: gana{" "}
                          {m.pen_winner === "HOME" ? teamName(m.home_team) : teamName(m.away_team)}
                        </div>
                      )}
                      <PredictionsList
                        rows={revealRows}
                        homeTeam={teamName(m.home_team)}
                        awayTeam={teamName(m.away_team)}
                        showPoints
                      />
                    </div>
                  )}

                  {/* Predictable: form */}
                  {!finished && predictable && (
                    <PredictionForm
                      matchId={m.id}
                      homeTeam={teamName(m.home_team)}
                      awayTeam={teamName(m.away_team)}
                      homeCrest={m.home_team_crest}
                      awayCrest={m.away_team_crest}
                      initial={{
                        pred_home: pred?.pred_home ?? null,
                        pred_away: pred?.pred_away ?? null,
                        pred_pen_winner: pred?.pred_pen_winner ?? null,
                      }}
                    />
                  )}

                  {/* Locked (not finished): reveal everyone's predictions */}
                  {!finished && locked && teamsKnown && (
                    <PredictionsList
                      rows={revealRows}
                      homeTeam={teamName(m.home_team)}
                      awayTeam={teamName(m.away_team)}
                      showPoints={false}
                    />
                  )}

                  {/* Teams not known yet */}
                  {!finished && !teamsKnown && (
                    <div className="mt-2 text-center text-sm text-white/60">
                      Equipos por definir. Podrás predecir cuando se conozcan.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
