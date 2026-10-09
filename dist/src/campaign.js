import { RULE_VERSION, SCENARIOS, MAX_TURNS, replay, evaluateCity } from "./model.js";

export const RECORD_KEY = "pocket-city-v1";
export const RECORD_LIMIT = 32768;
const validCode = seed => typeof seed === "string" && /^[A-Za-z0-9-]{1,40}$/.test(seed);
const validDate = value => typeof value === "string" && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

// Whitelist replay inputs; never accept saved snapshots or claimed scores as proof.
export function replayInput(value) {
  if (!value || value.version !== RULE_VERSION || !Object.hasOwn(SCENARIOS, value.scenario) || !validCode(value.seed) || !Array.isArray(value.actions) || value.actions.length > MAX_TURNS) return null;
  const actions = [];
  for (const a of value.actions) {
    if (a?.type === "pass") actions.push({ type: "pass" });
    else if (a?.type === "place" && Number.isInteger(a.index) && Number.isInteger(a.offer)) actions.push({ type: "place", index: a.index, offer: a.offer });
    else return null;
  }
  const input = { version: RULE_VERSION, scenario: value.scenario, seed: value.seed, actions };
  try { return { input, state: replay(input.seed, actions, input.scenario, input.version) }; } catch { return null; }
}

export function emptyRecord() { return { history: [], current: null, achievements: {} }; }
export function normalizeRecord(saved) {
  const record = emptyRecord();
  if (!saved || typeof saved !== "object") return record;
  if (Array.isArray(saved.history)) for (const h of saved.history.slice(-10)) {
    if (!h || !validCode(h.seed) || !Number.isFinite(h.score) || h.score < 0 || h.score > 1000000 || !validDate(h.date)) continue;
    if (h.version === RULE_VERSION && Object.hasOwn(SCENARIOS, h.scenario) && ["won", "lost"].includes(h.outcome)) {
      record.history.push({ version: RULE_VERSION, scenario: h.scenario, outcome: h.outcome, seed: h.seed, score: h.score, date: h.date });
    } else if (h.version === undefined || h.version === 1) {
      record.history.push({ version: 1, seed: h.seed, score: h.score, date: h.date });
    }
  }
  for (const id of Object.keys(SCENARIOS)) {
    const result = replayInput(saved.achievements?.[id]);
    if (result?.state.outcome === "won" && result.input.scenario === id) record.achievements[id] = result.input;
  }
  const current = replayInput(saved.current);
  if (current?.state.outcome === "playing") record.current = current.input;
  return record;
}

export function completedCount(record) { return Object.keys(normalizeRecord(record).achievements).length; }
export function recommendedScenario(record) {
  const earned = normalizeRecord(record).achievements;
  return Object.keys(SCENARIOS).find(id => !Object.hasOwn(earned, id)) || null;
}
export function recordTurn(record, state, date) {
  const next = normalizeRecord(record), result = replayInput(state);
  if (!result || result.state.outcome !== state.outcome) throw new TypeError("Invalid city outcome");
  if (result.state.outcome === "playing") { next.current = result.input; return next; }
  if (!validDate(date)) throw new TypeError("Invalid completion date");
  next.current = null;
  next.history.push({ version: RULE_VERSION, scenario: result.input.scenario, outcome: result.state.outcome, seed: result.input.seed, score: evaluateCity(result.state).score, date });
  next.history = next.history.slice(-10);
  if (result.state.outcome === "won" && !Object.hasOwn(next.achievements, result.input.scenario)) next.achievements[result.input.scenario] = result.input;
  return next;
}
