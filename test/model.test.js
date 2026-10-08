import test from "node:test";
import assert from "node:assert/strict";
import {
  createCity,
  offers,
  place,
  pass,
  replay,
  evaluateCity,
  neighbors,
} from "../dist/src/model.js";
test("seeded board and offers deterministic; all offer cards unique", () => {
  for (let i = 0; i < 100; i++) {
    const a = createCity("city-" + i);
    assert.deepEqual(a, createCity("city-" + i));
    assert.equal(a.board.filter((c) => c.terrain === "water").length, 3);
    assert.equal(new Set(offers(a)).size, 3);
    assert.ok(neighbors(0).length === 2);
  }
});
test("legal full games replay exactly without negative budget", () => {
  for (let i = 0; i < 50; i++) {
    let state = createCity("game-" + i);
    for (let t = 0; t < 20; t++) {
      const index = state.board.findIndex(
        (c) => c.terrain === "land" && !c.building,
      );
      let moved = false;
      for (let j = 0; j < 3; j++)
        try {
          state = place(state, index, j);
          moved = true;
          break;
        } catch {}
      if (!moved) state = pass(state);
      assert.ok(state.budget >= 0);
    }
    assert.equal(state.turn, 20);
    assert.deepEqual(replay(state.seed, state.actions), state);
    assert.ok(evaluateCity(state).score >= 0);
    assert.throws(() => pass(state));
  }
});
test("illegal indices and occupied cells rejected, state untouched", () => {
  const a = createCity("invalid");
  assert.throws(() => place(a, -1, 0));
  assert.throws(() => place(a, 12, 0));
  assert.throws(() => replay("x", [{ type: "hack" }]));
  assert.equal(a.turn, 0);
});
test("evaluation applies power shortage and adjacency", () => {
  const s = createCity("score");
  s.board = s.board.map(() => ({ terrain: "land", building: null }));
  s.board[12].building = "home";
  const alone = evaluateCity(s);
  assert.equal(alone.population, 3);
  assert.equal(alone.shortage, 2);
  s.board[11].building = "park";
  assert.ok(evaluateCity(s).score > alone.score);
  s.board[24].building = "plant";
  assert.equal(evaluateCity(s).shortage, 0);
});
