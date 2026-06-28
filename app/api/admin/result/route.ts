import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { classify } from "@/lib/scoring";
import { scoreFinishedMatches } from "@/lib/sync";
import type { MatchResult, Side } from "@/lib/types";

export const runtime = "nodejs";

function parseGoals(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 30) return null;
  return n;
}

/**
 * Admin safety-net: manually set/correct a match result. Sets the match to
 * FINISHED, recomputes the result, marks it unscored and re-distributes points.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user?.is_admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const matchId = String(body.match_id ?? "");
  const regHome = parseGoals(body.reg_home);
  const regAway = parseGoals(body.reg_away);
  const wentToPens = Boolean(body.went_to_pens);
  let penWinner = (body.pred_pen_winner ?? body.pen_winner ?? null) as Side | null;

  if (!matchId || regHome === null || regAway === null) {
    return NextResponse.json({ error: "Marcador inválido." }, { status: 400 });
  }

  if (wentToPens) {
    if (regHome !== regAway) {
      return NextResponse.json(
        { error: "Si fue a penales, el marcador de 90' debe ser empate." },
        { status: 400 }
      );
    }
    if (penWinner !== "HOME" && penWinner !== "AWAY") {
      return NextResponse.json({ error: "Elige el ganador de los penales." }, { status: 400 });
    }
  } else {
    penWinner = null;
  }

  const result: MatchResult = wentToPens ? "DRAW" : classify(regHome, regAway);

  const { error } = await db()
    .from("matches")
    .update({
      status: "FINISHED",
      reg_home: regHome,
      reg_away: regAway,
      result,
      went_to_pens: wentToPens,
      pen_winner: penWinner,
      scored: false, // force re-scoring
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el resultado." }, { status: 500 });
  }

  const scored = await scoreFinishedMatches();
  return NextResponse.json({ ok: true, ...scored });
}
