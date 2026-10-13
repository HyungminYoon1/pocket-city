import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCity, place, pass, replay, evaluateCity, offers, BUILDINGS } from "../dist/src/model.js";
import { normalizeRecord, emptyRecord, recordTurn, RECORD_KEY, RECORD_LIMIT } from "../dist/src/campaign.js";
import { loadRecord, saveRecord } from "../dist/src/storage.js";

test("edge: build bounds and exact affordability reject without mutating the city", () => {
  const s = createCity("lesson"), before = structuredClone(s);
  for (const i of [-0.001, 25, "", "7", null, NaN, Infinity]) assert.throws(() => place(s, i, 0));
  for (const o of [-0.001, 3, "", "0", null, NaN, Infinity]) assert.throws(() => place(s, 7, o));
  assert.deepEqual(s, before);
  for (const i of [0, 24]) {
    const fixture = structuredClone(s); fixture.board[i].terrain = "land"; fixture.budget = 1;
    assert.equal(place(fixture, i, 0).board[i].building, "road");
    fixture.budget = 0;
    assert.throws(() => place(fixture, i, 0));
  }
});

test("edge: every prefix of each victory restores exactly and terminal replay rejects one extra action", () => {
  const plans = JSON.parse(readFileSync(new URL("./fixtures/victories.json", import.meta.url), "utf8"));
  for (const [scenario, plan] of Object.entries(plans)) {
    let state = createCity("lesson", scenario);
    for (const move of plan) {
      state = move ? place(state, ...move) : pass(state);
      const record = recordTurn(emptyRecord(), state, "2026-10-13T00:00:00.000Z");
      const restored = normalizeRecord(JSON.parse(JSON.stringify(record)));
      assert.deepEqual(restored, record);
      if (state.outcome === "playing") assert.deepEqual(replay("lesson", restored.current.actions, scenario), state);
      else assert.equal(restored.current, null);
    }
    assert.throws(() => replay("lesson", [...state.actions, { type: "pass" }], scenario));
  }
});

test("edge: pressure grace ends at 5 and service grace ends at 7 using a numerical fixture", () => {
  const s = createCity("lesson");
  s.board.forEach(c => { c.terrain = "land"; c.building = null; });
  s.board[12].building = "road"; s.board[7].building = "home";
  s.turn = 4; assert.equal(evaluateCity(s).pressure, 0);
  s.turn = 5; assert.equal(evaluateCity(s).pressure, 3); // shortage 2 + unemployment 1
  s.turn = 6; assert.equal(evaluateCity(s).pressure, 3);
  s.turn = 7; assert.equal(evaluateCity(s).pressure, 4); // unserved population 3
});

test("edge: all scenario event boundaries distinguish 10, 11 and 12 without repeating activation", () => {
  for (const scenario of ["foundations", "garden", "transit"]) {
    const s = createCity("lesson", scenario); s.turn = 9;
    const ten = pass(s), eleven = pass(ten), twelve = pass(eleven);
    assert.equal(ten.lastTurn.event, false);
    assert.equal(eleven.lastTurn.event, true);
    assert.equal(twelve.lastTurn.event, false);
    assert.equal(evaluateCity(eleven).need, 0); // no homes: heat demand is conditional
    assert.equal(evaluateCity(eleven).trafficDemand, 0);
  }
});

test("edge: offers are unaffected by unrelated evaluation and replay requests", () => {
  const s = createCity("a".repeat(40), "garden"), first = offers(s);
  evaluateCity(createCity("other", "transit")); replay("other", [{ type: "pass" }]);
  assert.deepEqual(offers(s), first);
  assert.ok(first.every(k => Object.hasOwn(BUILDINGS, k)));
  assert.deepEqual(replay(s.seed, [], s.scenario), s);
});

test("edge: private read exact character limit and readback preserve peer keys", () => {
  const data = new Map([["peer-private", "keep"]]);
  const local = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  data.set(RECORD_KEY, "{}" + " ".repeat(RECORD_LIMIT - 2));
  let issues = 0;
  assert.deepEqual(loadRecord(local, () => issues++), emptyRecord());
  assert.equal(issues, 0);
  data.set(RECORD_KEY, data.get(RECORD_KEY) + " ");
  loadRecord(local, () => issues++); assert.equal(issues, 1);
  assert.equal(saveRecord(recordTurn(emptyRecord(), pass(createCity("lesson"))), local), true);
  assert.equal(loadRecord(local).current.actions.length, 1);
  assert.equal(data.get("peer-private"), "keep");
});
