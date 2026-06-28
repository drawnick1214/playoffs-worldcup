import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isLocked } from "@/lib/time";
import type { Side } from "@/lib/types";

export const runtime = "nodejs";

function parseGoals(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 30) return null;
  return n;
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const matchId = String(body.match_id ?? "");
  const predHome = parseGoals(body.pred_home);
  const predAway = parseGoals(body.pred_away);
  let penWinner = (body.pred_pen_winner as Side | null) ?? null;

  if (!matchId || predHome === null || predAway === null) {
    return NextResponse.json({ error: "Marcador inválido." }, { status: 400 });
  }

  const { data: match } = await db()
    .from("matches")
    .select("id, home_team, away_team, kickoff_utc, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  if (!match.home_team || !match.away_team) {
    return NextResponse.json({ error: "Los equipos aún no están definidos." }, { status: 400 });
  }
  if (match.status === "FINISHED" || isLocked(match.kickoff_utc)) {
    return NextResponse.json(
      { error: "El partido ya inició. La predicción está cerrada." },
      { status: 403 }
    );
  }

  // A tie requires choosing who wins the penalty shootout.
  if (predHome === predAway) {
    if (penWinner !== "HOME" && penWinner !== "AWAY") {
      return NextResponse.json(
        { error: "Si predices empate, elige quién gana en penales." },
        { status: 400 }
      );
    }
  } else {
    penWinner = null;
  }

  const { error } = await db().from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      pred_home: predHome,
      pred_away: predAway,
      pred_pen_winner: penWinner,
      points: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id" }
  );

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar la predicción." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
