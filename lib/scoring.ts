import type { MatchResult, Side } from "./types";

/** Classify a scoreline into HOME / AWAY / DRAW. */
export function classify(home: number, away: number): MatchResult {
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

export interface ScoredMatch {
  reg_home: number; // regulation/full-time goals (pre-penalties)
  reg_away: number;
  result: MatchResult; // DRAW when the match went to a penalty shootout
  went_to_pens: boolean;
  pen_winner: Side | null;
}

export interface ScoredPrediction {
  pred_home: number;
  pred_away: number;
  pred_pen_winner: Side | null;
}

/**
 * Points for a single prediction against a finished match.
 *  - Correct result (HOME/AWAY/DRAW at full time): +1
 *  - Exact score: +3 (stacks with the result point => 4 total)
 *  - Predicted a draw, the match went to penalties, and the predicted
 *    shootout winner is correct: +1 bonus
 * Max = 5 (exact tie + correct penalty winner).
 */
export function scorePrediction(m: ScoredMatch, p: ScoredPrediction): number {
  let points = 0;

  const predResult = classify(p.pred_home, p.pred_away);
  if (predResult === m.result) points += 1;

  if (p.pred_home === m.reg_home && p.pred_away === m.reg_away) points += 3;

  if (
    m.went_to_pens &&
    predResult === "DRAW" &&
    p.pred_pen_winner != null &&
    p.pred_pen_winner === m.pen_winner
  ) {
    points += 1;
  }

  return points;
}
