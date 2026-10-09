import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCity, replay, pass, evaluateCity } from "../dist/src/model.js";
import { RECORD_KEY, RECORD_LIMIT, emptyRecord, normalizeRecord, recordTurn, completedCount, recommendedScenario } from "../dist/src/campaign.js";
import { loadRecord, saveRecord, clearRecord } from "../dist/src/storage.js";

const plans = JSON.parse(readFileSync(new URL("./fixtures/victories.json", import.meta.url), "utf8"));
const date = "2026-10-09T00:00:00.000Z";
const actions = scenario => plans[scenario].map(move => move ? { type: "place", index: move[0], offer: move[1] } : { type: "pass" });
const win = scenario => replay("lesson", actions(scenario), scenario, 2);
function loss() { let state = createCity("empty"); while (state.outcome === "playing") state = pass(state); return state; }
function storage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}

test("independent v2 achievements and recommendations survive more than ten later losses and reload", () => {
  let record = recordTurn(emptyRecord(), win("foundations"), date);
  const witness = structuredClone(record.achievements.foundations);
  for (let i = 0; i < 12; i++) record = recordTurn(record, loss(), date);
  assert.equal(record.history.length, 10);
  assert.ok(record.history.every(h => h.outcome === "lost"));
  const local = storage();
  assert.equal(saveRecord(record, local), true);
  record = loadRecord(local);
  assert.equal(completedCount(record), 1);
  assert.deepEqual(record.achievements.foundations, witness);
  assert.equal(recommendedScenario(record), "garden");
  record = recordTurn(record, win("garden"), date);
  assert.equal(recommendedScenario(record), "transit");
  record = recordTurn(record, win("transit"), date);
  record = recordTurn(record, win("foundations"), date);
  assert.equal(completedCount(record), 3);
  assert.equal(recommendedScenario(record), null);
  assert.deepEqual(record.achievements.foundations, witness);
});

test("actual partial v2 replay remains exact across persistence without awarding an achievement", () => {
  const state = replay("lesson", actions("garden").slice(0, 11), "garden", 2);
  const record = recordTurn(emptyRecord(), state, date), local = storage();
  assert.equal(saveRecord(record, local), true);
  const saved = loadRecord(local);
  assert.deepEqual(saved.current, { version: 2, scenario: "garden", seed: "lesson", actions: state.actions });
  assert.deepEqual(replay(saved.current.seed, saved.current.actions, saved.current.scenario, saved.current.version), state);
  assert.equal(completedCount(saved), 0);
  assert.equal(saved.history.length, 0);
});

test("v1 and claimed or wrong v2 outcomes do not award campaign achievements", () => {
  const old = { seed: "lesson", score: 330, date, version: 1, outcome: "won", scenario: "foundations" };
  const claimed = { ...old, version: 2 };
  const lost = loss();
  for (const value of [old, claimed, { ...lost, outcome: "won" }, createCity("lesson"), { ...win("garden"), version: 1 }, { ...win("foundations"), actions: [...actions("foundations"), { type: "pass" }] }]) {
    const saved = normalizeRecord({ history: [old, claimed], achievements: { foundations: value } });
    assert.equal(completedCount(saved), 0);
    assert.equal(saved.history.length, 2); // Display history is not achievement evidence.
  }
  assert.throws(() => recordTurn(emptyRecord(), { ...lost, outcome: "won" }, date));
  assert.throws(() => recordTurn(emptyRecord(), { ...win("garden"), outcome: "lost" }, date));
  assert.equal(completedCount(recordTurn(emptyRecord(), lost, date)), 0);
  const mismatched = normalizeRecord({ achievements: { foundations: win("garden") } });
  assert.equal(completedCount(mismatched), 0);
});

test("stored outcome and score come from replay; extra state and private fields are discarded", () => {
  const state = win("foundations");
  const record = recordTurn(emptyRecord(), { ...state, budget: 999999, playerName: "discard" }, date);
  assert.equal(record.history[0].score, evaluateCity(state).score);
  assert.deepEqual(Object.keys(record.achievements.foundations).sort(), ["actions", "scenario", "seed", "version"]);
  assert.ok(!JSON.stringify(record).includes("discard"));
  assert.throws(() => recordTurn(emptyRecord(), state, "invented-date"));
});

test("bounded local records fail safely and reset removes only this game's key", () => {
  const local = storage(); local.data.set("other", "keep");
  local.data.set(RECORD_KEY, "x".repeat(RECORD_LIMIT + 1));
  assert.deepEqual(loadRecord(local), emptyRecord());
  local.data.set(RECORD_KEY, "{broken");
  assert.deepEqual(loadRecord(local), emptyRecord());
  const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } };
  assert.deepEqual(loadRecord(blocked), emptyRecord());
  assert.equal(saveRecord(emptyRecord(), blocked), false);
  assert.equal(clearRecord(blocked), false);
  assert.equal(saveRecord(recordTurn(emptyRecord(), win("transit"), date), local), true);
  assert.ok(local.data.get(RECORD_KEY).length <= RECORD_LIMIT);
  assert.equal(clearRecord(local), true);
  assert.equal(local.data.get("other"), "keep");
  assert.deepEqual(loadRecord(local), emptyRecord());
  let message = "";
  local.data.set(RECORD_KEY, JSON.stringify({ current: { version: 1 }, history: [{ seed: "old", score: 2, date }] }));
  const record = loadRecord(local, value => { message = value; });
  assert.equal(record.current, null);
  assert.equal(record.history[0].version, 1);
  assert.match(message, /이전 규칙/);
});

test("three independent witnesses plus a current replay and ten completions fit the retention bound", () => {
  let record = emptyRecord();
  for (const id of Object.keys(plans)) record = recordTurn(record, win(id), date);
  for (let i = 0; i < 11; i++) record = recordTurn(record, loss(), date);
  record = recordTurn(record, replay("lesson", actions("transit").slice(0, 19), "transit", 2), date);
  const local = storage();
  assert.equal(saveRecord(record, local), true);
  assert.ok(local.data.get(RECORD_KEY).length <= RECORD_LIMIT);
  const loaded = loadRecord(local);
  assert.equal(completedCount(loaded), 3);
  assert.equal(loaded.history.length, 10);
  assert.equal(loaded.current.actions.length, 19);
  assert.deepEqual(loaded, record);
});

test("blocked localStorage property access is contained for read, write and reset", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Error("blocked"); } });
  try {
    assert.deepEqual(loadRecord(), emptyRecord());
    assert.equal(saveRecord(emptyRecord()), false);
    assert.equal(clearRecord(), false);
  } finally { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else delete globalThis.localStorage; }
});
