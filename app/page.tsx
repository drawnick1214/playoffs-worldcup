import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBogota, isLocked } from "@/lib/time";
import { STAGE_ORDER, stageLabel } from "@/lib/football";
import type { Match, Prediction } from "@/lib/types";
import PredictionForm from "@/components/PredictionForm";
import LogoutButton from "@/components/LogoutButton";
import TeamName from "@/components/TeamName";

export const dynamic = "force-dynamic";

function teamName(n: string | null): string {
  return n && n.trim() ? n : "Por definir";
}

export default async function HomePage() {
  const user = await requireUser();
  const supabase = db();

  const [{ data: matchesRaw }, { data: myPredsRaw }, { data: usersRaw }, { data: allPredsRaw }] =
    await Promise.all([
      supabase.from("matches").select("*"),
      supabase.from("predictions").select("*").eq("user_id", user.id),
      supabase.from("users").select("id, display_name"),
      supabase.from("predictions").select("user_id, points"),
    ]);

  const matches = (matchesRaw ?? []) as Match[];
  const myPreds = (myPredsRaw ?? []) as Prediction[];
  const users = (usersRaw ?? []) as { id: string; display_name: string }[];
  const allPreds = (allPredsRaw ?? []) as { user_id: string; points: number | null }[];

  // ----- Leaderboard -----
  const totals = new Map<string, number>();
  for (const u of users) totals.set(u.id, 0);
  for (const p of allPreds) {
    if (p.points != null) totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.points);
  }
  const leaderboard = users
    .map((u) => ({ ...u, points: totals.get(u.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name));

  // ----- Predictions by match -----
  const predByMatch = new Map<string, Prediction>();
  for (const p of myPreds) predByMatch.set(p.match_id, p);

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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚽ Quiniela Mundial 2026</h1>
          <p className="text-sm text-slate-400">Hola, {user.display_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.is_admin && (
            <Link
              href="/admin"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Leaderboard */}
      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">🏆 Tabla de posiciones</h2>
        {leaderboard.length === 0 ? (
          <p className="px-1 text-sm text-slate-400">
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
                    u.id === user.id ? "bg-emerald-950/50" : ""
                  }`}
                >
                  <span className="flex items-center">
                    <span className="mr-2 inline-block w-6 text-center text-slate-500">
                      {medal ?? `${i + 1}.`}
                    </span>
                    {u.display_name}
                    {u.id === user.id && <span className="ml-2 text-xs text-emerald-400">(tú)</span>}
                  </span>
                  <span className="font-semibold">{u.points} pts</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Rules */}
      <details className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-300">¿Cómo se puntúa?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Marcador exacto: <strong>4 puntos</strong></li>
          <li>Resultado correcto (ganador o empate): <strong>1 punto</strong></li>
          <li>Si predices empate, elige quién gana en penales. Acertar el ganador de penales: <strong>+1 punto</strong></li>
          <li>Cada predicción se cierra cuando inicia el partido.</li>
        </ul>
      </details>

      {/* Matches */}
      {groups.length === 0 && (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-400">
          Todavía no hay partidos de playoffs disponibles. Vuelve pronto.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.stage} className="mb-8">
          <h2 className="mb-3 border-b border-slate-800 pb-1 text-lg font-semibold">{g.label}</h2>
          <div className="space-y-3">
            {g.matches.map((m) => {
              const pred = predByMatch.get(m.id);
              const teamsKnown = !!(m.home_team && m.away_team);
              const finished = m.status === "FINISHED";
              const locked = isLocked(m.kickoff_utc);
              const predictable = teamsKnown && !locked && !finished;

              return (
                <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{formatBogota(m.kickoff_utc)}</span>
                    {finished ? (
                      <span className="text-emerald-400">Finalizado</span>
                    ) : locked && teamsKnown ? (
                      <span className="text-amber-400">Cerrado</span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center justify-center gap-2 text-base font-semibold">
                    <TeamName name={teamName(m.home_team)} crest={m.home_team_crest} />
                    <span className="text-slate-500">vs</span>
                    <TeamName name={teamName(m.away_team)} crest={m.away_team_crest} reverse />
                  </div>

                  {/* Finished: real result + my prediction + points */}
                  {finished && (
                    <div className="mt-2 text-center">
                      <div className="text-2xl font-bold">
                        {m.reg_home} - {m.reg_away}
                      </div>
                      {m.went_to_pens && (
                        <div className="text-xs text-amber-300">
                          Penales: gana{" "}
                          {m.pen_winner === "HOME" ? teamName(m.home_team) : teamName(m.away_team)}
                        </div>
                      )}
                      <div className="mt-2 text-sm text-slate-400">
                        {pred ? (
                          <>
                            Tu predicción: {pred.pred_home} - {pred.pred_away}
                            {pred.pred_home === pred.pred_away && pred.pred_pen_winner && (
                              <>
                                {" "}
                                (penales:{" "}
                                {pred.pred_pen_winner === "HOME"
                                  ? teamName(m.home_team)
                                  : teamName(m.away_team)}
                                )
                              </>
                            )}{" "}
                            ·{" "}
                            <span className="font-semibold text-emerald-400">
                              {pred.points ?? 0} pts
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500">No predijiste este partido.</span>
                        )}
                      </div>
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

                  {/* Locked (not finished) */}
                  {!finished && locked && teamsKnown && (
                    <div className="mt-2 text-center text-sm text-slate-400">
                      {pred ? (
                        <>
                          Tu predicción: {pred.pred_home} - {pred.pred_away}
                          {pred.pred_home === pred.pred_away && pred.pred_pen_winner && (
                            <>
                              {" "}
                              (penales:{" "}
                              {pred.pred_pen_winner === "HOME"
                                ? teamName(m.home_team)
                                : teamName(m.away_team)}
                              )
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500">No alcanzaste a predecir.</span>
                      )}
                    </div>
                  )}

                  {/* Teams not known yet */}
                  {!finished && !teamsKnown && (
                    <div className="mt-2 text-center text-sm text-slate-500">
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
