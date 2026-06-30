import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, scorePrediction } from "./scoring";

test("classify", () => {
  assert.equal(classify(2, 1), "HOME");
  assert.equal(classify(0, 3), "AWAY");
  assert.equal(classify(1, 1), "DRAW");
});

test("exact score = 3 (does not stack with result)", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 2, pred_away: 1, pred_advance_winner: null }), 3);
});

test("correct result only = 1", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 3, pred_away: 0, pred_advance_winner: null }), 1);
});

test("wrong result = 0", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 0, pred_away: 2, pred_advance_winner: null }), 0);
});

test("exact draw + correct advancing team = 4 (max)", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, drew_at_90: true, advance_winner: "AWAY" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "AWAY" as const }), 4);
});

test("exact draw + wrong advancing team = 3", () => {
  const m = { reg_home: 1, reg_away: 1, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "AWAY" as const }), 3);
});

test("predicted draw, wrong score, correct advancing team = 1 + 1", () => {
  const m = { reg_home: 0, reg_away: 0, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 2);
});

test("draw decided in extra time, 90' score unknown -> result + advance = 2", () => {
  const m = { reg_home: null, reg_away: null, result: "DRAW" as const, drew_at_90: true, advance_winner: "HOME" as const };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 2);
});

test("advance bonus does not apply when winner decided in regulation", () => {
  const m = { reg_home: 2, reg_away: 1, result: "HOME" as const, drew_at_90: false, advance_winner: null };
  assert.equal(scorePrediction(m, { pred_home: 1, pred_away: 1, pred_advance_winner: "HOME" as const }), 0);
});
