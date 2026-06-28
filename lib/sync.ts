import { db } from "./db";
import { fetchWorldCupMatches, fetchVenueMap, mapMatch } from "./football";
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
  const [fdMatches, venueMap] = await Promise.all([
    fetchWorldCupMatches(),
    fetchVenueMap().catch(() => ({} as Record<string, string>)),
  ]);
  // Matches already FINISHED in our DB are frozen: we never overwrite their
  // result fields again (protects manual admin corrections and locked results).
  const { data: finishedRows } = await supabase
    .from("matches")
    .select("external_id")
    .eq("status", "FINISHED");
  const frozen = new Set((finishedRows ?? []).map((m) => m.external_id as string));

  const rows = fdMatches
    .map(mapMatch)
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .filter((r) => !frozen.has(r.external_id))
    .map((r) => {
      const key = r.kickoff_utc ? new Date(r.kickoff_utc).toISOString() : null;
      return { ...r, venue: (key && venueMap[key]) || r.venue };
    });

  // 2. Upsert (by external_id). `scored` is never in the payload, so the flag
  //    is preserved on existing rows.
  if (rows.length > 0) {
    const payload = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("matches").upsert(payload, { onConflict: "external_id" });
    if (error) throw new Error(`Error al guardar partidos: ${error.message}`);
  }

  const scored = await scoreFinishedMatches();

  return {
    upserted: rows.length,
    scoredMatches: scored.scoredMatches,
    scoredPredictions: scored.scoredPredictions,
  };
}

/** Score every finished-but-unscored match. Shared by sync and manual admin override. */
export async function scoreFinishedMatches(): Promise<{
  scoredMatches: number;
  scoredPredictions: number;
}> {
  const supabase = db();

  const { data: pending } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "FINISHED")
    .eq("scored", false);

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
