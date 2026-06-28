import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, scorePrediction } from "./scoring";

test("classify", () => {
  assert.equal(classify(2, 1), "HOME");
  assert.equal(classify(0, 3), "AWAY");
  assert.equal(classify(1, 1), "DRAW");
});

test("exact score win = 4 (3 + 1)", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, went_to_pens: false, pen_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 2, pred_away: 1, pred_pen_winner: null }), 4);
});

test("correct result only = 1", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, went_to_pens: false, pen_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 3, pred_away: 0, pred_pen_winner: null }), 1);
});

test("wrong result = 0", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, went_to_pens: false, pen_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 0, pred_away: 2, pred_pen_winner: null }), 0);
});

test("exact tie (no pens) = 4", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, went_to_pens: false, pen_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_pen_winner: "HOME" as const }), 4);
});

test("exact tie + correct penalty winner = 5", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, went_to_pens: true, pen_winner: "AWAY" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_pen_winner: "AWAY" as const }), 5);
});

test("predicted tie + wrong penalty winner = 4 (result + exact only)", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, went_to_pens: true, pen_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_pen_winner: "AWAY" as const }), 4);
});

test("predicted tie wrong score but correct pen winner = 1 + 1", () => {
  const m = { reg_home: 0, reg_away: 0, result: "DRAW" as const, went_to_pens: true, pen_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_pen_winner: "HOME" as const }), 2);
});

test("penalty bonus does not apply when a winner is decided in regulation/ET", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, went_to_pens: false, pen_winner: null };
  // predicted a draw -> no result point, no exact, no pen bonus
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_pen_winner: "HOME" as const }), 0);
});
