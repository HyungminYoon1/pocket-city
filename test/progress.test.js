import test from "node:test";
import assert from "node:assert/strict";
import { APP_IDS, PROGRESS_KEY, reportCompletion, clearProgress } from "../dist/src/progress.js";
const date = "2026-10-09T00:00:00.000Z";
const entry = { completed: 1, total: 5, updatedAt: date };
function storage(value = null) {
  const data = new Map();
  if (value !== null) data.set(PROGRESS_KEY, value);
  data.set("private-run", "keep");
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
test("minimal summary preserves all other allowlisted apps and clear removes only pocket-city", () => {
  assert.equal(APP_IDS.length, 15); assert.equal(new Set(APP_IDS).size, 15);
  const apps = Object.fromEntries(APP_IDS.filter(id => id !== "pocket-city").map(id => [id, { ...entry }]));
  const local = storage(JSON.stringify({ version: 1, apps }));
  assert.equal(reportCompletion(2, local, date), true);
  const summary = JSON.parse(local.data.get(PROGRESS_KEY));
  assert.deepEqual(summary.apps["pocket-city"], { completed: 2, total: 3, updatedAt: date });
  assert.deepEqual(Object.keys(summary).sort(), ["apps", "version"]);
  for (const [id, value] of Object.entries(apps)) assert.deepEqual(summary.apps[id], value);
  assert.equal(clearProgress(local), true);
  assert.deepEqual(JSON.parse(local.data.get(PROGRESS_KEY)), { version: 1, apps });
  assert.equal(local.data.get("private-run"), "keep");
});
test("missing summary is created on completion only; empty clear does not create it", () => {
  const local = storage();
  assert.equal(clearProgress(local), true);
  assert.equal(local.data.has(PROGRESS_KEY), false);
  for (const value of [0, -1, 4, 1.5, NaN, "1"]) assert.equal(reportCompletion(value, local, date), false);
  assert.equal(reportCompletion(1, local, date), true);
  assert.equal(JSON.parse(local.data.get(PROGRESS_KEY)).apps["pocket-city"].completed, 1);
});
test("oversized, malformed, unknown, polluted or invalid aggregates stay untouched", () => {
  const invalid = ["{", "x".repeat(8193), "null", "[]", JSON.stringify({ version: 2, apps: {} }), JSON.stringify({ version: 1, apps: {}, seed: "private" })];
  for (const bad of [
    { unknown: entry }, { "__proto__": entry, unknown: entry },
    { "echo-vault": { ...entry, seed: "private" } },
    { "echo-vault": { ...entry, completed: -1 } },
    { "echo-vault": { ...entry, completed: 6 } },
    { "echo-vault": { ...entry, total: 1001 } },
    { "echo-vault": { ...entry, completed: 0.5 } },
    { "echo-vault": { ...entry, updatedAt: "yesterday" } },
    { "echo-vault": { ...entry, updatedAt: "2026-02-30T00:00:00.000Z" } },
  ]) invalid.push(JSON.stringify({ version: 1, apps: bad }));
  invalid.push('{"version":1,"apps":{"__proto__":{"completed":1,"total":2,"updatedAt":"2026-10-09T00:00:00.000Z"}}}');
  for (const raw of invalid) {
    const local = storage(raw);
    assert.equal(reportCompletion(1, local, date), false);
    assert.equal(clearProgress(local), false);
    assert.equal(local.data.get(PROGRESS_KEY), raw);
  }
  assert.equal(reportCompletion(1, storage(), "invented"), false);
});
test("storage getter, read and quota failures are contained", () => {
  const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(reportCompletion(1, blocked, date), false);
  assert.equal(clearProgress(blocked), false);
  const quota = { getItem: () => null, setItem() { throw Error(); } };
  assert.equal(reportCompletion(1, quota, date), false);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Error("blocked"); } });
  try { assert.equal(reportCompletion(1), false); assert.equal(clearProgress(), false); }
  finally { if (previous) Object.defineProperty(globalThis, "localStorage", previous); else delete globalThis.localStorage; }
});
