import { db } from "./db";
import { fetchWorldCupMatches, fetchOpenfootballMap, mapMatch, type OpenfootballInfo } from "./football";
import { scorePrediction } from "./scoring";
import type { Match, Prediction } from "./types";

export interface SyncResult {
  upserted: number;
  scoredMatches: number;
  scoredPredictions: number;
}

/**
 * Pull the World Cup knockout matches from football-data, upsert them, and
 * distribute points for any match that just finished. Idempotent: a match is
 * only scored once (scored flag), and re-running never double-counts.
 */
export async function runSync(): Promise<SyncResult> {
  const supabase = db();

  // 1. Fetch + map knockout matches, plus venues from openfootball (best-effort).
  const [fdMatches, ofMap] = await Promise.all([
    fetchWorldCupMatches(),
    fetchOpenfootballMap().catch(() => ({}) as Record<string, OpenfootballInfo>),
  ]);
  // Only matches the admin manually locked are protected from being overwritten.
  // Everything else stays in sync with the API, so late corrections (e.g. the
  // penalty-shootout winner recorded after the final whistle) are picked up.
  const { data: lockedRows } = await supabase
    .from("matches")
    .select("external_id")
    .eq("result_locked", true);
  const locked = new Set((lockedRows ?? []).map((m) => m.external_id as string));

  const rows = fdMatches
    .map(mapMatch)
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => !locked.has(r.external_id))
    .map((r) => {
      const key = r.kickoff_utc ? new Date(r.kickoff_utc).toISOString() : null;
      return { ...r, venue: (key && ofMap[key]?.venue) || r.venue };
    });

  // 2. Upsert (by external_id). `scored` is never in the payload, so the flag
  //    is preserved on existing rows.
  if (rows.length > 0) {
    const payload = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("matches").upsert(payload, { onConflict: "external_id" });
    if (error) throw new Error(`Error al guardar partidos: ${error.message}`);
  }

  // 3. Backfill the 90' score for finished draws (extra time / penalties), taken
  //    from openfootball's goal-by-goal data. This lets the exact-score be graded
  //    automatically without the admin entering anything by hand.
  await backfill90Scores(ofMap);

  const scored = await scoreFinishedMatches();

  return {
    upserted: rows.length,
    scoredMatches: scored.scoredMatches,
    scoredPredictions: scored.scoredPredictions,
  };
}

/**
 * Fill in the 90' scoreline for finished draws (extra time / penalties) whose
 * regulation score is still unknown, using openfootball's goal-by-goal data.
 * Only applies a draw scoreline (home === away). Sets scored=false to re-grade.
 */
async function backfill90Scores(ofMap: Record<string, OpenfootballInfo>): Promise<void> {
  const supabase = db();
  const { data: pending } = await supabase
    .from("matches")
    .select("id, kickoff_utc")
    .eq("status", "FINISHED")
    .eq("drew_at_90", true)
    .is("reg_home", null);

  for (const m of pending ?? []) {
    const key = m.kickoff_utc ? new Date(m.kickoff_utc as string).toISOString() : null;
    const reg90 = key ? ofMap[key]?.reg90 : undefined;
    if (reg90 && reg90.home === reg90.away) {
      await supabase
        .from("matches")
        .update({ reg_home: reg90.home, reg_away: reg90.away, scored: false })
        .eq("id", m.id);
    }
  }
}

/**
 * (Re)score every finished match. Idempotent — runs each sync so that any late
 * correction from the API (or admin) is reflected in the points immediately.
 */
export async function scoreFinishedMatches(): Promise<{
  scoredMatches: number;
  scoredPredictions: number;
}> {
  const supabase = db();

  const { data: pending } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "FINISHED");

  const matches = (pending ?? []) as Match[];
  let scoredMatches = 0;
  let scoredPredictions = 0;

  for (const m of matches) {
    if (m.result == null) continue; // wait for the result to be available

    const { data: predsRaw } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", m.id);
    const preds = (predsRaw ?? []) as Prediction[];

    for (const p of preds) {
      const points = scorePrediction(
        {
          reg_home: m.reg_home,
          reg_away: m.reg_away,
          result: m.result,
          drew_at_90: m.drew_at_90,
          advance_winner: m.advance_winner,
        },
        {
          pred_home: p.pred_home,
          pred_away: p.pred_away,
          pred_advance_winner: p.pred_advance_winner,
        }
      );
      await supabase.from("predictions").update({ points }).eq("id", p.id);
      scoredPredictions++;
    }

    await supabase.from("matches").update({ scored: true }).eq("id", m.id);
    scoredMatches++;
  }

  return { scoredMatches, scoredPredictions };
}
