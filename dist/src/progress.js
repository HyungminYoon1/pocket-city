export const PROGRESS_KEY = "web-lab-progress-v1";
export const APP_IDS = Object.freeze([
  "data-mirage", "echo-vault", "light-route", "logic-foundry", "neon-tactics",
  "orbit-courier", "packet-journey", "parcel-panic", "pixel-kitchen", "pocket-city",
  "route-race", "sense-lab", "swarm-garden", "think-forge", "traffic-lab",
]);
const OWN_ID = "pocket-city", MAX_LENGTH = 8192;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const isoDate = value => typeof value === "string" && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
function read(storage) {
  const raw = storage.getItem(PROGRESS_KEY);
  if (raw === null) return { version: 1, apps: {} };
  if (typeof raw !== "string" || raw.length > MAX_LENGTH) throw Error("Invalid summary size");
  const value = JSON.parse(raw);
  if (!exactKeys(value, ["version", "apps"]) || value.version !== 1 || !object(value.apps) || Object.keys(value.apps).length > APP_IDS.length) throw Error("Invalid summary");
  for (const [id, entry] of Object.entries(value.apps)) {
    if (!APP_IDS.includes(id) || !exactKeys(entry, ["completed", "total", "updatedAt"]) || !Number.isInteger(entry.completed) || !Number.isInteger(entry.total) || entry.completed < 0 || entry.completed > entry.total || entry.total > 1000 || !isoDate(entry.updatedAt)) throw Error("Invalid summary entry");
  }
  return value;
}
// Called only after a real v2 victory and successful private-record persistence.
export function reportCompletion(completed, storage, updatedAt = new Date().toISOString()) {
  try {
    storage ??= globalThis.localStorage;
    if (!Number.isInteger(completed) || completed < 1 || completed > 3 || !isoDate(updatedAt)) return false;
    const summary = read(storage);
    summary.apps[OWN_ID] = { completed, total: 3, updatedAt };
    const raw = JSON.stringify(summary);
    if (raw.length > MAX_LENGTH) return false;
    storage.setItem(PROGRESS_KEY, raw);
    return true;
  } catch { return false; }
}
export function clearProgress(storage) {
  try {
    storage ??= globalThis.localStorage;
    const summary = read(storage);
    if (!Object.hasOwn(summary.apps, OWN_ID)) return true;
    delete summary.apps[OWN_ID];
    storage.setItem(PROGRESS_KEY, JSON.stringify(summary));
    return true;
  } catch { return false; }
}
