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
import Tabs from "@/components/Tabs";

export const dynamic = "force-dynamic";

function teamName(n: string | null): string {
  return n && n.trim() ? n : "Por definir";
}

export default async function HomePage() {
  const session = await requireUser();
  const supabase = db();

  const [{ data: matchesRaw }, { data: usersRaw }, { data: allPredsRaw }] = await Promise.all([
    supabase.from("matches").select("*"),
    supabase.from("users").select("id, display_name, approved"),
    supabase.from("predictions").select("*"),
  ]);

  const matches = (matchesRaw ?? []) as Match[];
  const users = (usersRaw ?? []) as { id: string; display_name: string; approved: boolean }[];
  const allPreds = (allPredsRaw ?? []) as Prediction[];

  const me = users.find((u) => u.id === session.id);

  // ----- Approval gate -----
  if (!me || !me.approved) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-xl backdrop-blur-md">
          <div className="text-5xl">⏳</div>
          <h1 className="mt-3 text-2xl font-black">Cuenta pendiente</h1>
          <p className="mt-3 text-white/80">
            Hola {session.display_name}, tu cuenta está <b>pendiente de aprobación</b> por el
            administrador. Te avisará cuando puedas entrar a jugar.
          </p>
          <div className="mt-6">
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  const nameById = new Map<string, string>();
  for (const u of users) nameById.set(u.id, u.display_name);

  // ----- Leaderboard (approved players only) -----
  const totals = new Map<string, number>();
  const approvedUsers = users.filter((u) => u.approved);
  for (const u of approvedUsers) totals.set(u.id, 0);
  for (const p of allPreds) {
    if (p.points != null && totals.has(p.user_id)) {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + p.points);
    }
  }
  const leaderboard = approvedUsers
    .map((u) => ({ ...u, points: totals.get(u.id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name));

  // ----- Predictions indexed by match -----
  const predByMatch = new Map<string, Prediction>();
  const allByMatch = new Map<string, Prediction[]>();
  for (const p of allPreds) {
    if (p.user_id === session.id) predByMatch.set(p.match_id, p);
    const list = allByMatch.get(p.match_id) ?? [];
    list.push(p);
    allByMatch.set(p.match_id, list);
  }

  // ----- Group matches by stage -----
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

  // ===== Leaderboard tab content =====
  const leaderboardNode = (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-md">
      <h2 className="mb-3 text-lg font-black uppercase tracking-wide text-amber-300">
        🏆 Tabla de posiciones
      </h2>
      {leaderboard.length === 0 ? (
        <p className="px-1 text-sm text-white/70">Aún no hay jugadores aprobados.</p>
      ) : (
        <ol className="space-y-1">
          {leaderboard.map((u, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <li
                key={u.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  u.id === session.id ? "bg-amber-400/25 ring-1 ring-amber-300/40" : ""
                }`}
              >
                <span className="flex items-center font-semibold">
                  <span className="mr-2 inline-block w-6 text-center text-white/70">
                    {medal ?? `${i + 1}.`}
                  </span>
                  {u.display_name}
                  {u.id === session.id && <span className="ml-2 text-xs text-amber-200">(tú)</span>}
                </span>
                <span className="font-black text-amber-300">{u.points} pts</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  // ===== Predicción tab content =====
  const prediccionNode = (
    <div>
      {/* Rules (collapsible) */}
      <details className="mb-4 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-white/80 backdrop-blur">
        <summary className="cursor-pointer font-bold text-white">📋 Reglas — cómo se juega</summary>

        <p className="mt-3 font-semibold text-white">⚽ Cómo se juega</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Predice el <strong>marcador</strong> de cada partido de las eliminatorias.</li>
          <li>
            Puedes <strong>editar</strong> tu predicción hasta <strong>15 minutos antes</strong> del
            inicio del partido. Después queda bloqueada.
          </li>
          <li>
            Tus predicciones son <strong>privadas</strong>: nadie las ve hasta que el partido se
            cierra. Ahí se revelan las de todos.
          </li>
        </ul>

        <p className="mt-3 font-semibold text-white">
          🏅 Puntos <span className="font-normal text-white/60">(solo cuentan los 90 minutos; la prórroga NO)</span>
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><strong>3 pts</strong> — Marcador exacto. <span className="text-white/60">Ej: pones 2-1 y queda 2-1.</span></li>
          <li><strong>1 pt</strong> — Aciertas solo el resultado (quién gana o empate), con marcador distinto. <span className="text-white/60">Ej: pones 3-0 y queda 2-1 → acertaste que ganaba el local.</span></li>
          <li><strong>0 pts</strong> — No aciertas el resultado.</li>
          <li className="text-white/60">El marcador exacto y el resultado no se suman: o son 3, o es 1.</li>
        </ul>

        <p className="mt-3 font-semibold text-white">🤝 Si crees que el partido será empate</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            En eliminatorias siempre hay un clasificado, pero aquí el <strong>empate se mide a los
            90 minutos</strong>: si al minuto 90 van iguales, es empate (no importa lo que pase en la
            prórroga o los penales).
          </li>
          <li>
            Cuando predices un empate (ej. <strong>1-1</strong>), también debes elegir{" "}
            <strong>qué equipo crees que clasifica</strong>.
          </li>
        </ul>
        <p className="mt-2 font-medium text-white/90">Puntos cuando predices empate:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><strong>3 pts</strong> si aciertas el marcador exacto del empate (pones 1-1 y a los 90&apos; van 1-1).</li>
          <li><strong>1 pt</strong> si solo aciertas que fue empate, con otro marcador (pones 1-1 y van 0-0).</li>
          <li><strong>+1 pt</strong> adicional si aciertas el equipo que clasifica.</li>
        </ul>
        <p className="mt-2 rounded-lg bg-amber-400/15 px-3 py-2 text-white/90">
          <strong>Ejemplo:</strong> predices <strong>1-1 y que pasa Brasil</strong>. El partido va 1-1
          a los 90&apos; y Brasil clasifica → <strong>3 + 1 = 4 puntos</strong> (el máximo). 🎯
        </p>

        <p className="mt-3 text-xs text-white/60">
          Gana la polla quien acumule más puntos. Mira tu posición en la pestaña 🏆 Leaderboard.
        </p>
      </details>

      <p className="mb-4 text-center text-xs text-white/70">
        🕐 Todos los horarios están en hora de Colombia 🇨🇴
      </p>

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

              const revealRows: RevealRow[] =
                locked || finished
                  ? (allByMatch.get(m.id) ?? []).map((p) => ({
                      name: nameById.get(p.user_id) ?? "Jugador",
                      home: p.pred_home,
                      away: p.pred_away,
                      advanceWinner: p.pred_advance_winner,
                      points: p.points,
                      isMe: p.user_id === session.id,
                    }))
                  : [];

              const advanceTeam =
                m.advance_winner === "HOME" ? teamName(m.home_team) : teamName(m.away_team);

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

                  {/* Finished: real result */}
                  {finished && (
                    <div className="mt-2 text-center">
                      {m.drew_at_90 ? (
                        <>
                          <div className="text-3xl font-black text-amber-300 drop-shadow">
                            {m.reg_home != null ? `${m.reg_home} - ${m.reg_away}` : "Empate 90'"}
                          </div>
                          <div className="text-xs text-amber-200">Pasa: {advanceTeam}</div>
                        </>
                      ) : (
                        <div className="text-3xl font-black text-amber-300 drop-shadow">
                          {m.reg_home} - {m.reg_away}
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
                        pred_advance_winner: pred?.pred_advance_winner ?? null,
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
    </div>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black uppercase leading-tight tracking-tight drop-shadow sm:text-2xl">
            ⚽ Polla Playoffs <span className="text-amber-300">del Mundial</span>
          </h1>
          <p className="text-sm text-white/80">Hola, {session.display_name} 👋</p>
        </div>
        <div className="flex items-center gap-2">
          {session.is_admin && (
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

      <Tabs prediccion={prediccionNode} leaderboard={leaderboardNode} />
    </main>
  );
}
