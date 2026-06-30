import type { MatchResult, Side } from "./types";

/** Classify a scoreline into HOME / AWAY / DRAW. */
export function classify(home: number, away: number): MatchResult {
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

export interface ScoredMatch {
  reg_home: number | null; // 90' goals, home (null when unknown, e.g. decided in extra time)
  reg_away: number | null;
  result: MatchResult; // result at 90' — DRAW when level after 90'
  drew_at_90: boolean; // true when level after 90' (decided in extra time or penalties)
  advance_winner: Side | null; // the team that advanced (every match: winner of the tie)
}

export interface ScoredPrediction {
  pred_home: number;
  pred_away: number;
  pred_advance_winner: Side | null;
}

/**
 * Points for a single prediction against a finished match:
 *  - Exact 90' score: 3 pts
 *  - Otherwise, correct result at 90' (HOME/AWAY/DRAW): 1 pt
 *    (exact and result do NOT stack — it's 3, or 1, or 0)
 *  - Correct team to advance: +1 pt, on EVERY match (added on top).
 *    The predicted team to advance is the predicted winner; for a predicted
 *    draw it's the explicit "who advances" pick.
 * Max = 4 (exact + correct advancing team).
 */
export function scorePrediction(m: ScoredMatch, p: ScoredPrediction): number {
  let points = 0;

  const predResult = classify(p.pred_home, p.pred_away);

  // Exact score only when the 90' scoreline is known.
  const exact =
    m.reg_home != null &&
    m.reg_away != null &&
    p.pred_home === m.reg_home &&
    p.pred_away === m.reg_away;

  if (exact) {
    points += 3;
  } else if (predResult === m.result) {
    points += 1;
  }

  // Who advances — counts on every match.
  const predAdvancer: Side | null =
    p.pred_home > p.pred_away ? "HOME" : p.pred_home < p.pred_away ? "AWAY" : p.pred_advance_winner;
  if (predAdvancer != null && m.advance_winner != null && predAdvancer === m.advance_winner) {
    points += 1;
  }

  return points;
}
