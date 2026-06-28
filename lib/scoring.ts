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
  advance_winner: Side | null; // who advanced (only when drew_at_90)
}

export interface ScoredPrediction {
  pred_home: number;
  pred_away: number;
  pred_advance_winner: Side | null;
}

/**
 * Points for a single prediction against a finished match.
 *  - Correct result at 90' (HOME/AWAY/DRAW): +1
 *  - Exact 90' score: +3 (stacks with the result point => 4 total)
 *  - Predicted a draw, the match was level after 90', and the predicted team
 *    to advance ("ganador de la llave") is correct: +1 bonus
 * Max = 5 (exact tie + correct advancing team).
 */
export function scorePrediction(m: ScoredMatch, p: ScoredPrediction): number {
  let points = 0;

  const predResult = classify(p.pred_home, p.pred_away);
  if (predResult === m.result) points += 1;

  // Exact score only when the 90' scoreline is known.
  if (
    m.reg_home != null &&
    m.reg_away != null &&
    p.pred_home === m.reg_home &&
    p.pred_away === m.reg_away
  ) {
    points += 3;
  }

  if (
    m.drew_at_90 &&
    predResult === "DRAW" &&
    p.pred_advance_winner != null &&
    p.pred_advance_winner === m.advance_winner
  ) {
    points += 1;
  }

  return points;
}
