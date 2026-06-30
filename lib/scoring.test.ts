import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, scorePrediction } from "./scoring";

test("classify", () => {
  assert.equal(classify(2, 1), "HOME");
  assert.equal(classify(0, 3), "AWAY");
  assert.equal(classify(1, 1), "DRAW");
});

// Decisive match: Home win 2-1, Home advances.
const HOME_WIN = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: "HOME" as const };

test("exact score + correct advancer = 4", () => {
  assert.equal(scorePrediction(HOME_WIN, { pred_home: 2, pred_away: 1, pred_advance_winner: null }), 4);
});

test("correct result + correct advancer = 2", () => {
  assert.equal(scorePrediction(HOME_WIN, { pred_home: 3, pred_away: 0, pred_advance_winner: null }), 2);
});

test("wrong result (and wrong advancer) = 0", () => {
  assert.equal(scorePrediction(HOME_WIN, { pred_home: 0, pred_away: 2, pred_advance_winner: null }), 0);
});

// Draw at 90', away team advances on penalties.
const DRAW_AWAY_ADV = { reg_home: 1, reg_away: 1, result: "DRAW" as const, drew_at_90: true, advance_winner: "AWAY" as const };

test("exact draw + correct advancer = 4 (max)", () => {
  assert.equal(scorePrediction(DRAW_AWAY_ADV, { pred_home: 1, pred_away: 1, pred_advance_winner: "AWAY" as const }), 4);
});

test("exact draw + wrong advancer = 3", () => {
  assert.equal(scorePrediction(DRAW_AWAY_ADV, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 3);
});

test("predicted draw wrong score + correct advancer = 1 + 1", () => {
  assert.equal(scorePrediction(DRAW_AWAY_ADV, { pred_home: 0, pred_away: 0, pred_advance_winner: "AWAY" as const }), 2);
});

test("draw decided in extra time, 90' score unknown + correct advancer = 2", () => {
  const m = { reg_home: null, reg_away: null, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 2);
});
