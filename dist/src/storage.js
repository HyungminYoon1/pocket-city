import { RECORD_KEY, RECORD_LIMIT, normalizeRecord, emptyRecord } from "./campaign.js";
import { RULE_VERSION } from "./model.js";

export function loadRecord(storage, onIssue = () => {}) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(RECORD_KEY);
    if (!raw) return emptyRecord();
    if (raw.length > RECORD_LIMIT) throw Error("Record too large");
    const saved = JSON.parse(raw), record = normalizeRecord(saved);
    if (saved?.current && !record.current) onIssue(saved.current.version !== RULE_VERSION ? "이전 규칙의 진행은 이어갈 수 없습니다." : "저장된 진행을 재현할 수 없습니다.");
    return record;
  } catch { onIssue("도시 기록을 불러올 수 없습니다."); return emptyRecord(); }
}
export function saveRecord(record, storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = JSON.stringify(normalizeRecord(record));
    if (raw.length > RECORD_LIMIT) return false;
    storage.setItem(RECORD_KEY, raw);
    return true;
  } catch { return false; }
}
export function clearRecord(storage) {
  try { storage ??= globalThis.localStorage; storage.removeItem(RECORD_KEY); return true; } catch { return false; }
}
