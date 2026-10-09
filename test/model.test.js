import test from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS, RULE_VERSION, SCENARIOS, MAX_TURNS, createCity, offers, place, pass, replay, evaluateCity, goals, neighbors } from "../dist/src/model.js";

function fixture(scenario = "foundations", cells = {}) {
  const s = createCity("unit", scenario);
  s.board = s.board.map(() => ({ terrain: "land", building: null }));
  s.board[12].building = "road";
  for (const [i, b] of Object.entries(cells)) s.board[i].building = b;
  return s;
}
function freeze(state) {
  Object.freeze(state.board);
  state.board.forEach(Object.freeze);
  Object.freeze(state.actions);
  Object.freeze(state.checkpoints);
  return Object.freeze(state);
}
test("100 seeds per scenario: deterministic terrain, finite fair three-card cycle", () => {
  for (const scenario of Object.keys(SCENARIOS)) for (let i = 0; i < 100; i++) {
    const a = createCity("city-" + i, scenario);
    assert.deepEqual(a, createCity(a.seed, scenario));
    assert.equal(a.board.filter(c => c.terrain === "water").length, 3);
    // A protected central cross prevents random terrain from trapping the hub.
    for (const j of [2, 7, 10, 11, 12, 13, 14, 17, 22]) assert.equal(a.board[j].terrain, "land");
    for (let t = 0; t < 18; t++) {
      const seen = new Set();
      for (let n = 0; n < 3; n++) {
        const cards = offers({ ...a, turn: t + n });
        assert.equal(new Set(cards).size, 3);
        assert.equal(cards[0], "road");
        cards.forEach(c => seen.add(c));
      }
      assert.equal(seen.size, Object.keys(BUILDINGS).length);
    }
  }
  assert.deepEqual(neighbors(0), [1, 5]);
  assert.deepEqual(neighbors(4), [3, 9]);
});
test("150 legal simulations terminate, remain bounded and replay exactly", () => {
  for (const scenario of Object.keys(SCENARIOS)) for (let i = 0; i < 50; i++) {
    let s = createCity("game-" + i, scenario);
    while (s.outcome === "playing") {
      const index = s.board.findIndex(c => c.terrain === "land" && !c.building);
      const offer = offers(s).findIndex(t => BUILDINGS[t].cost <= s.budget);
      const original = s, old = structuredClone(s);
      s = index >= 0 && offer >= 0 ? place(freeze(s), index, offer) : pass(freeze(s));
      assert.deepEqual(original, old);
      assert.ok(s.budget >= 0 && Number.isInteger(s.budget));
      assert.ok(s.trust >= 0 && s.trust <= 100);
      assert.ok(s.turn <= MAX_TURNS && evaluateCity(s).score >= 0);
      assert.deepEqual(replay(s.seed, s.actions, scenario), s);
    }
    assert.throws(() => pass(s));
    assert.throws(() => place(s, 0, 0));
  }
});
test("invalid codes, scenarios, actions, terrain, funds and old versions rejected", () => {
  const s = createCity("invalid");
  for (const seed of ["", "<script>", "x".repeat(41), null]) assert.throws(() => createCity(seed));
  assert.throws(() => createCity("x", "__proto__"));
  for (const i of [-1, 25, 1.5, NaN]) assert.throws(() => place(s, i, 0));
  for (const offer of [-1, 3, 0.5]) assert.throws(() => place(s, 6, offer));
  assert.throws(() => place(s, 12, 0));
  assert.throws(() => place(s, s.board.findIndex(c => c.terrain === "water"), 0));
  assert.throws(() => place({ ...s, budget: 0 }, 6, 0));
  assert.throws(() => replay("x", [{ type: "hack" }]));
  assert.throws(() => replay("x", [null]));
  assert.throws(() => replay("x", Array(21).fill({ type: "pass" })));
  assert.throws(() => replay("x", [], "foundations", 1));
  assert.equal(s.turn, 0);
});
test("only the connected road component powers facilities; roads do not wrap rows", () => {
  const s = fixture("foundations", { 13: "home", 0: "plant", 4: "road", 5: "road" });
  const m = evaluateCity(s);
  assert.equal(m.supply, 0);
  assert.equal(m.shortage, 2);
  assert.equal(m.isolated, 3);
  assert.equal(m.connected[5], false);
  s.board[7].building = s.board[2].building = s.board[1].building = "road";
  const linked = evaluateCity(s);
  assert.equal(linked.supply, 6);
  assert.equal(linked.shortage, 0);
  assert.equal(linked.capacity, 12);
});
test("shops need both linked residents and power for income; maintenance applies even when isolated", () => {
  const s = fixture("garden", { 7: "home", 11: "shop", 13: "plant" });
  let m = evaluateCity(s);
  assert.equal(m.jobs, 4);
  assert.equal(m.activeShops, 1);
  assert.equal(m.netIncome, 3);
  s.board[13].building = null; s.board[0].building = "plant";
  m = evaluateCity(s);
  assert.equal(m.upkeep, 1);
  assert.equal(m.activeShops, 0);
  assert.equal(m.netIncome, 1);
  s.board[7].building = null; s.board[0].building = null;
  assert.equal(evaluateCity(s).activeShops, 0);
});
test("parks serve clean adjacent homes; powered clinics protect exposed homes within Manhattan distance 2", () => {
  const s = fixture("garden", { 7: "home", 2: "park", 6: "plant", 11: "road" });
  assert.equal(evaluateCity(s).served, 0);
  assert.equal(evaluateCity(s).exposed, 3);
  s.board[17].building = "clinic";
  assert.equal(evaluateCity(s).served, 3);
  assert.equal(evaluateCity(s).exposed, 0);
  s.board[6].building = null;
  assert.equal(evaluateCity(s).shortage, 3);
  assert.equal(evaluateCity(s).served, 3); // Clean home still has its park during blackout.
  s.board[2].building = null;
  assert.equal(evaluateCity(s).served, 0);
  const river = fixture("garden", { 7: "park" });
  river.board[2].terrain = "water";
  assert.equal(evaluateCity(river).environment, 5);
});
test("events apply during turn 11 settlement, including pass and placement previews", () => {
  for (const scenario of Object.keys(SCENARIOS)) {
    const s = fixture(scenario, { 7: "home", 11: "shop", 13: "plant", 2: "park" });
    s.turn = 10;
    const before = evaluateCity(s), next = pass(s), after = evaluateCity(next);
    assert.equal(next.lastTurn.event, true);
    const built = place(s, 17, 0);
    assert.equal(built.lastTurn.event, true);
    assert.equal(evaluateCity(built).need, after.need);
    if (scenario === "garden") assert.equal(after.need, before.need + 2);
    if (scenario === "transit") assert.equal(after.trafficDemand, before.trafficDemand + 6);
    if (scenario === "foundations") assert.equal(after.income, before.income - 1);
  }
});
test("checkpoints grant funds or reduce trust without arbitrary immediate failure", () => {
  const good = fixture("foundations", { 7: "home", 11: "shop", 13: "plant", 2: "park" });
  good.turn = 7;
  const m = evaluateCity(good), next = pass(good);
  assert.equal(next.checkpoints[0].met, true);
  assert.equal(next.budget, good.budget + m.netIncome + 4);
  const empty = createCity("miss");
  empty.turn = 7;
  const fail = pass(empty);
  assert.equal(fail.checkpoints[0].met, false);
  assert.equal(fail.trust, empty.trust + 3 - 12);
  assert.equal(fail.outcome, "playing");
});
test("grace period, unpaid maintenance, trust collapse and empty-city final defeat", () => {
  const s = fixture("garden", { 7: "home", 11: "home", 13: "home", 17: "home" });
  s.turn = 3;
  assert.equal(pass(s).lastTurn.trustDelta, 3);
  s.turn = 4; s.trust = 1;
  const collapsed = pass(s);
  assert.equal(collapsed.trust, 0);
  assert.equal(collapsed.outcome, "lost");
  assert.throws(() => pass(collapsed));
  const broke = fixture("garden", { 0: "plant", 4: "plant", 20: "plant", 24: "plant" });
  broke.budget = 0;
  const debt = pass(broke);
  assert.equal(debt.budget, 0);
  assert.equal(debt.lastTurn.debt, 2);
  assert.equal(debt.lastTurn.trustDelta, -3);
  let empty = createCity("empty");
  for (let i = 0; i < 20; i++) empty = pass(empty);
  assert.equal(empty.outcome, "lost");
  assert.ok(empty.trust > 0);
  assert.equal(goals(empty).every(g => g.met), false);
});

// Legal victory witnesses from the bounded local balance probe.
// Each pair is [plot index, offer index]; null is a turn of rest.
const victories = {
  foundations: [[7,0],[6,2],[2,2],[3,2],[11,2],[8,1],[13,2],[17,0],[19,2],[22,2],[18,1],[16,0],[15,0],[0,2],[10,1],null,[4,1],null,[9,2],[20,0]],
  garden: [[13,0],[7,2],[14,2],[19,2],[8,2],[18,1],[17,2],[11,0],[15,2],[6,2],[10,1],[0,1],[16,0],[21,0],[20,1],[22,0],[2,1],null,[3,2],[23,0]],
  transit: [[7,0],[6,2],[2,2],[3,2],[11,2],[8,1],[13,2],[17,0],[16,0],[22,1],[18,0],[20,1],[15,2],[19,0],[14,2],[21,1],null,null,[0,2],[23,0]],
};
for (const [scenario, plan] of Object.entries(victories)) test(scenario + ": a legal 20-turn victory is attainable, immutable and exactly replayable", () => {
  let s = createCity("lesson", scenario);
  for (const move of plan) {
    const original = s, snapshot = structuredClone(s);
    freeze(s);
    s = move ? place(s, ...move) : pass(s);
    assert.deepEqual(original, snapshot);
  }
  assert.equal(s.turn, 20);
  assert.equal(s.outcome, "won");
  assert.equal(s.version, RULE_VERSION);
  assert.ok(goals(s).every(g => g.met));
  assert.deepEqual(replay("lesson", s.actions, scenario, RULE_VERSION), s);
});
