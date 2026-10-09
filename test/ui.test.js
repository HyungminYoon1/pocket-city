import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import * as model from "../dist/src/model.js";
import { cleanSeed } from "../dist/src/core.js";

const [source, html, css] = await Promise.all([
  readFile(new URL("../dist/src/app.js", import.meta.url), "utf8"),
  readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
  readFile(new URL("../dist/styles.css", import.meta.url), "utf8"),
]);

// Minimal DOM double for the actual app callbacks, not browser/layout evidence.
function boot() {
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
  assert.equal((source.match(/^import /gm) || []).length, 2);
  runInNewContext(source.replace(/^import .*;\r?\n/gm, ""), {
    ...model, document, $: id => elements[id], cleanSeed, freshSeed: () => "lesson",
    loadLocal: () => ({}), saveLocal: () => true, confirm: () => true,
    announce: text => { elements.notice.textContent = text; }, tool() {},
  }, { filename: "dist/src/app.js", timeout: 1000 });
  return { elements, document, plot: i => elements.city.children[i], preview: () => elements.preview.textContent };
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
