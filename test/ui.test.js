import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as model from "../dist/src/model.js";
import { cleanSeed } from "../dist/src/core.js";
import * as campaign from "../dist/src/campaign.js";
import * as storageBoundary from "../dist/src/storage.js";
import * as progress from "../dist/src/progress.js";

const [source, html, css] = await Promise.all([
  readFile(new URL("../dist/src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
  readFile(new URL("../dist/styles.css", import.meta.url), "utf8"),
]);

// Minimal DOM double for the actual app callbacks, not browser/layout evidence.
function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function boot(storage = memoryStorage()) {
  const document = { activeElement: null };
  class Element {
    constructor() {
      this.children = []; this.attributes = {}; this.className = "";
      this.disabled = false; this.hovered = false; this.value = "";
      this.classList = { add() {}, toggle() {} };
    }
    append(...children) {
      for (const child of children) { child.parentElement = this; this.children.push(child); }
    }
    replaceChildren(...children) {
      if (this.contains(document.activeElement)) document.activeElement = document.body;
      for (const child of this.children) child.parentElement = null;
      this.children = []; this.append(...children);
    }
    contains(target) { return this === target || this.children.some(c => c.contains(target)); }
    matches(selector) {
      return this.className.split(" ").includes("plot") && !this.disabled && (!selector.includes(":hover") || this.hovered);
    }
    querySelector(selector) { return this.children.find(c => c.matches(selector)) || null; }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() {
      const old = document.activeElement;
      if (old === this) return;
      document.activeElement = document.body; old?.onblur?.();
      document.activeElement = this; this.onfocus?.();
    }
    blur() { document.activeElement = document.body; this.onblur?.(); }
    enter() { this.hovered = true; this.onpointerenter?.(); }
    leave() { this.hovered = false; this.onpointerleave?.(); }
  }
  document.body = new Element(); document.activeElement = document.body;
  document.createElement = () => new Element();
  const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  document.body.append(...Object.values(elements));
  elements.scenario.value = "foundations";
  assert.equal((source.match(/^import /gm) || []).length, 5);
  runInNewContext(source.replace(/^import .*;\r?\n/gm, ""), {
    ...model, ...campaign, document, $: id => elements[id], cleanSeed, freshSeed: () => "lesson",
    loadRecord: (_, onIssue) => storageBoundary.loadRecord(storage, onIssue),
    saveRecord: record => storageBoundary.saveRecord(record, storage),
    clearRecord: () => storageBoundary.clearRecord(storage),
    reportCompletion: count => progress.reportCompletion(count, storage),
    clearProgress: () => progress.clearProgress(storage), confirm: () => true,
    announce: text => { elements.notice.textContent = text; }, tool() {},
  }, { filename: "dist/src/app.js", timeout: 1000 });
  return { elements, document, storage, plot: i => elements.city.children[i], preview: () => elements.preview.textContent };
}

test("offer click → plot focus → scroll-related pointerleave retains computed keyboard preview", () => {
  const ui = boot();
  ui.elements.offers.children[0].onclick();
  const plot = ui.plot(7);
  assert.equal(plot.attributes["aria-label"], "2행 3열 빈 땅");
  plot.enter(); plot.focus();
  const settlement = ui.preview();
  assert.match(settlement, /건설·턴 정산 후: 예산 16/);
  plot.leave();
  assert.equal(ui.document.activeElement, plot);
  assert.equal(ui.preview(), settlement);
});
test("blur keeps the hovered plot, then leaving both focus and hover clears its preview", () => {
  const ui = boot(), plot = ui.plot(7);
  plot.enter(); plot.focus();
  const settlement = ui.preview();
  plot.blur();
  assert.equal(ui.preview(), settlement);
  plot.leave();
  assert.match(ui.preview(), /^도로 · 비용/);
});
test("late leave/blur of another plot cannot clear the currently focused plot", () => {
  const ui = boot(), old = ui.plot(7), current = ui.plot(12);
  old.enter(); old.focus(); current.focus();
  assert.match(ui.preview(), /중앙 도로 연결/);
  const inspected = ui.preview();
  old.leave(); old.onblur();
  assert.equal(ui.preview(), inspected);
  current.blur();
  assert.match(ui.preview(), /^도로 · 비용/);
});
test("rerender ignores detached plot events and recalculates the newly selected building", () => {
  const ui = boot(), old = ui.plot(7);
  old.enter(); old.focus();
  ui.elements.offers.children[1].onclick();
  assert.match(ui.preview(), /^주택 · 비용/);
  const current = ui.plot(7);
  current.focus();
  const settlement = ui.preview();
  assert.match(settlement, /^주택 건설·턴 정산 후: 예산 13/);
  old.leave(); old.onblur();
  assert.equal(ui.preview(), settlement);
  current.blur();
  assert.match(ui.preview(), /^주택 · 비용/);
});

function declarations(selector) {
  const block = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selectors]) => selectors.trim() === selector);
  assert.ok(block, "Missing explicit style: " + selector);
  return Object.fromEntries([...block[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, key, value]) => [key, value.trim()]));
}
function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const [r, g, b] = hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
test("completed-panel buttons have readable default/hover/focus colors and a visible focus ring", () => {
  const panel = declarations(".endgame");
  for (const selector of ["#endgame button", "#endgame button:hover:not(:disabled)", "#endgame button:focus-visible"]) {
    const style = declarations(selector);
    assert.ok(contrast(style.color, style.background) >= 4.5, selector + " text contrast");
  }
  const focus = declarations("#endgame button:focus-visible");
  assert.match(focus.outline, /^3px solid #[0-9a-f]{6}$/i);
  assert.ok(contrast(focus.outline.match(/#[0-9a-f]{6}/i)[0], panel.background) >= 3, "focus ring against blue panel");
});

const plans = JSON.parse(await readFile(new URL("./fixtures/victories.json", import.meta.url), "utf8"));
function play(ui, plan) {
  for (const move of plan) {
    if (move) { ui.elements.offers.children[move[1]].onclick(); ui.plot(move[0]).onclick({ detail: 1 }); }
    else ui.elements.pass.onclick();
  }
}
test("actual UI callbacks publish only a persisted independent victory, never preview, entry or loss", () => {
  const ui = boot();
  assert.equal(ui.storage.data.has(progress.PROGRESS_KEY), false);
  ui.plot(7).enter(); ui.plot(7).focus();
  assert.equal(ui.storage.data.has(progress.PROGRESS_KEY), false);
  play(ui, plans.foundations);
  const summary = JSON.parse(ui.storage.data.get(progress.PROGRESS_KEY));
  assert.equal(summary.apps["pocket-city"].completed, 1);
  assert.equal(summary.apps["pocket-city"].total, 3);
  assert.match(ui.elements["record-summary"].textContent, /캠페인 1\/3/);
  const before = ui.storage.data.get(progress.PROGRESS_KEY);
  const reloaded = boot(ui.storage);
  assert.equal(ui.storage.data.get(progress.PROGRESS_KEY), before); // Viewing old achievements does not report again.
  for (let run = 0; run < 12; run++) {
    reloaded.elements["new-city"].onclick();
    for (let turn = 0; turn < 20; turn++) reloaded.elements.pass.onclick();
  }
  assert.equal(ui.storage.data.get(progress.PROGRESS_KEY), before);
  assert.match(reloaded.elements["record-summary"].textContent, /캠페인 1\/3 · 최근 완료 10\/10/);
  assert.match(reloaded.elements.achievements.children[0].textContent, /✓ 완료/);
  assert.match(reloaded.elements.progress.textContent, /폭염/);
});
test("UI resume preserves an actual v2 city and reset removes only own private record and aggregate entry", () => {
  const ui = boot();
  ui.elements.scenario.value = "garden"; ui.elements["apply-seed"].onclick();
  play(ui, plans.garden.slice(0, 11));
  const before = ui.storage.data.get(campaign.RECORD_KEY), reloaded = boot(ui.storage);
  assert.equal(reloaded.elements.resume.hidden, false);
  reloaded.elements.resume.onclick();
  assert.equal(ui.storage.data.get(campaign.RECORD_KEY), before);
  assert.equal(reloaded.elements.budget.textContent, model.replay("lesson", plans.garden.slice(0, 11).map(move => move ? { type: "place", index: move[0], offer: move[1] } : { type: "pass" }), "garden", 2).budget);
  play(reloaded, plans.garden.slice(11));
  const other = { completed: 2, total: 5, updatedAt: "2026-10-09T00:00:00.000Z" };
  const summary = JSON.parse(ui.storage.data.get(progress.PROGRESS_KEY)); summary.apps["echo-vault"] = other;
  ui.storage.data.set(progress.PROGRESS_KEY, JSON.stringify(summary));
  ui.storage.data.set("echo-private", "keep");
  reloaded.elements.clear.onclick();
  assert.equal(ui.storage.data.has(campaign.RECORD_KEY), false);
  assert.deepEqual(JSON.parse(ui.storage.data.get(progress.PROGRESS_KEY)), { version: 1, apps: { "echo-vault": other } });
  assert.equal(ui.storage.data.get("echo-private"), "keep");
  assert.match(reloaded.elements["record-summary"].textContent, /캠페인 0\/3 · 최근 완료 0\/10/);
});
test("UI blocked private persistence does not create a gallery achievement and reports the failure", () => {
  const local = memoryStorage();
  local.setItem = (key, value) => { if (key === campaign.RECORD_KEY) throw Error("quota"); local.data.set(key, value); };
  const ui = boot(local); play(ui, plans.foundations);
  assert.equal(local.data.has(progress.PROGRESS_KEY), false);
  assert.match(ui.elements.notice.textContent, /저장/);
});

test("old claimed wins and invalid current versions stay display-only, while first-screen event remains visible", () => {
  const local = memoryStorage();
  local.data.set(campaign.RECORD_KEY, JSON.stringify({
    history: [{ version: 1, scenario: "foundations", outcome: "won", score: 999, seed: "old", date: "2026-10-09T00:00:00.000Z" }, { version: 2, scenario: "garden", outcome: "won", score: 326, seed: "lesson", date: "2026-10-09T00:00:00.000Z" }],
    current: { version: 1, seed: "lesson", actions: [] },
  }));
  const ui = boot(local);
  assert.equal(ui.elements.resume.hidden, true);
  assert.match(ui.elements.notice.textContent, /이전 규칙/);
  assert.match(ui.elements["record-summary"].textContent, /캠페인 0\/3/);
  assert.match(ui.elements.history.children[1].children[0].textContent, /이전 규칙 v1/);
  assert.match(ui.elements["event-status"].textContent, /11턴 · 정착 지원 종료: 기본 수입 3 → 2/);
  assert.equal(local.data.has(progress.PROGRESS_KEY), false);
});

test("failed reset preserves saved progress and reports failure; failed new-city save remains visible", () => {
  const local = memoryStorage(), ui = boot(local);
  play(ui, plans.foundations.slice(0, 2));
  const before = local.data.get(campaign.RECORD_KEY);
  local.removeItem = () => { throw Error("blocked"); };
  ui.elements.clear.onclick();
  assert.equal(local.data.get(campaign.RECORD_KEY), before);
  assert.match(ui.elements.notice.textContent, /삭제할 수 없습니다/);
  local.setItem = () => { throw Error("quota"); };
  ui.elements["new-city"].onclick();
  assert.match(ui.elements.notice.textContent, /저장할 수 없습니다/);
});
