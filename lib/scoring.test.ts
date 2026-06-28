import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, scorePrediction } from "./scoring";

test("classify", () => {
  assert.equal(classify(2, 1), "HOME");
  assert.equal(classify(0, 3), "AWAY");
  assert.equal(classify(1, 1), "DRAW");
});

test("exact score win = 4 (3 + 1)", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 2, pred_away: 1, pred_advance_winner: null }), 4);
});

test("correct result only = 1", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 3, pred_away: 0, pred_advance_winner: null }), 1);
});

test("wrong result = 0", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 0, pred_away: 2, pred_advance_winner: null }), 0);
});

test("draw with known 90' score (admin-entered) + correct advancing team = 5", () => {
  // Only happens when the admin manually enters the 90' scoreline; the API never
  // sets a 90' score for matches that went to extra time / penalties.
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, drew_at_90: true, advance_winner: "AWAY" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "AWAY" as const }), 5);
});

test("predicted tie + wrong advancing team = 4 (result + exact only)", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "AWAY" as const }), 4);
});

test("draw decided in extra time: 90' score unknown -> result + advance only = 2", () => {
  // reg score null because football-data fullTime would include extra-time goals
  const m = { reg_home: null, reg_away: null, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  // predicted a draw (1-1) and the correct team to advance
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 2);
});

test("advance bonus does not apply when winner decided in regulation", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 0);
});
