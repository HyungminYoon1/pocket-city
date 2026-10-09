import { $, freshSeed, cleanSeed, loadLocal, saveLocal, announce, tool } from "./core.js";
import { BUILDINGS, MAX_TURNS, RULE_VERSION, SCENARIOS, createCity, offers, evaluateCity, goals, place, pass, replay } from "./model.js";
const KEY = "pocket-city-v1";
const saved = loadLocal(KEY, {});
let record = {
  history: Array.isArray(saved?.history) ? saved.history.filter(h => h && typeof h.seed === "string" && /^[A-Za-z0-9-]{1,40}$/.test(h.seed) && Number.isFinite(h.score) && h.score >= 0 && h.score <= 1000000 && typeof h.date === "string").slice(-10) : [],
  current: saved?.current || null,
};
let state, selected = 0, resumeState = null;
let storageMessage = "";
try {
  if (record.current) {
    if (record.current.version !== RULE_VERSION) storageMessage = "규칙이 v2로 바뀌어 이전 진행 판은 이어갈 수 없습니다. 이전 완료 점수는 v1로 표시합니다.";
    else {
      resumeState = replay(cleanSeed(record.current.seed), record.current.actions, record.current.scenario, record.current.version);
      if (resumeState.outcome !== "playing") resumeState = null;
    }
  }
} catch { storageMessage = "저장된 진행을 재현할 수 없습니다. 새 도시를 시작하세요."; }
$("resume").hidden = !resumeState;
for (const [id, s] of Object.entries(SCENARIOS)) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = s.name;
  $("scenario").append(option);
}
function save() {
  if (!saveLocal(KEY, record)) announce("이 브라우저에 도시 기록을 저장할 수 없습니다.");
}
function start(seed = freshSeed(), scenario = $("scenario").value) {
  state = createCity(cleanSeed(seed), scenario);
  selected = 0;
  $("scenario").value = scenario;
  $("status").textContent = "중앙 도로에서 생활권을 확장하세요. 4턴까지 신뢰 보호, 6턴까지 서비스·환경 부담 유예.";
  announce("");
  render();
}
function records() {
  $("history").replaceChildren();
  if (!record.history.length) {
    const p = document.createElement("p");
    p.textContent = "완료한 도시 최대 10개를 보관합니다. 시나리오와 규칙 버전별로 비교하세요.";
    $("history").append(p);
  }
  for (const h of [...record.history].reverse()) {
    const row = document.createElement("div"), a = document.createElement("span"), b = document.createElement("strong");
    row.className = "history-row";
    const modern = h.version === RULE_VERSION && Object.hasOwn(SCENARIOS, h.scenario);
    a.textContent = (modern ? SCENARIOS[h.scenario].name + (h.outcome === "won" ? " · 성공" : " · 미달") : "이전 규칙 v1") + " · " + h.seed + " · " + h.date.slice(0, 10);
    b.textContent = h.score + " PT";
    row.append(a, b);
    $("history").append(row);
  }
  $("progress").textContent = "최근 10개 완료 기록의 성공: " + Object.entries(SCENARIOS).map(([id, s]) => {
    const won = record.history.some(h => h.version === RULE_VERSION && h.scenario === id && h.outcome === "won");
    return (won ? "✓ " : "○ ") + s.name;
  }).join(" → ");
}
function showMetrics(m) {
  $("budget").textContent = state.budget;
  $("population").textContent = m.population;
  $("power").textContent = m.supply + " / " + m.need;
  $("environment").textContent = m.environment;
  $("score").textContent = m.score;
  $("trust").textContent = state.trust;
  $("trust").parentElement.classList.toggle("critical", state.trust < 35);
  $("services").textContent = m.served + " / " + m.population;
  $("transport").textContent = m.trafficDemand + " / " + m.capacity;
  $("economy").textContent = "턴 수입 " + m.income + " − 유지비 " + m.upkeep + " = " + signed(m.netIncome);
  $("diagnostics").textContent = "단절 " + m.isolated + " · 전력 부족 " + m.shortage + " · 실업 " + m.unemployment + " · 혼잡 " + m.traffic + " · 오염 노출 " + m.exposed;
  $("goals").replaceChildren(...goals(state).map(g => {
    const p = document.createElement("p");
    p.className = g.met ? "done" : "";
    p.textContent = (g.met ? "● " : "○ ") + g.label + " · 현재 " + g.value;
    return p;
  }));
}
const signed = n => (n >= 0 ? "+" : "") + n;
function render() {
  const m = evaluateCity(state), scenario = SCENARIOS[state.scenario], done = state.outcome !== "playing";
  showMetrics(m);
  $("turn").textContent = String(Math.min(MAX_TURNS, state.turn + (done ? 0 : 1))).padStart(2, "0");
  $("seed").value = state.seed;
  $("city-name").textContent = "CITY / " + state.seed.slice(0, 18).toUpperCase();
  $("mission-title").textContent = scenario.name;
  $("mission-copy").textContent = scenario.subtitle;
  $("active-scenario").textContent = "현재 진행: " + scenario.name + " · 선택 변경은 새 도시 시작에 적용";
  $("timeline").replaceChildren();
  for (const entry of [...scenario.checkpoints, scenario.event].sort((a, b) => a.turn - b.turn)) {
    const p = document.createElement("p"), result = state.checkpoints.find(c => c.turn === entry.turn);
    p.className = result ? result.met ? "done" : "critical" : state.turn >= entry.turn ? "done" : "";
    p.textContent = entry.turn + "턴 · " + entry.name + " — " + (entry.hint || entry.desc) + (result ? result.met ? " · 통과 +4 예산" : " · 미달 −12 신뢰" : "");
    $("timeline").append(p);
  }
  $("city").replaceChildren();
  state.board.forEach((cell, i) => {
    const b = document.createElement("button");
    b.className = "plot " + (cell.terrain === "water" ? "water" : cell.building || "empty");
    const disconnected = cell.building && cell.building !== "park" && !m.connected[i];
    if (disconnected) b.classList.add("disconnected");
    if (cell.building === "home" && !m.serviced[i]) b.classList.add("unserved");
    b.disabled = done || cell.terrain === "water";
    const description = cell.terrain === "water" ? "강" : cell.building ? BUILDINGS[cell.building].name + (disconnected ? " · 도로 단절" : "") + (cell.building === "home" ? m.serviced[i] ? " · 서비스 있음" : " · 서비스 없음" : "") : "빈 땅";
    b.setAttribute("aria-label", (Math.floor(i / 5) + 1) + "행 " + ((i % 5) + 1) + "열 " + description);
    if (cell.building) {
      const block = document.createElement("span"), name = document.createElement("span");
      block.className = "building"; block.textContent = BUILDINGS[cell.building].symbol;
      name.className = "plot-name"; name.textContent = BUILDINGS[cell.building].name;
      b.append(block, name);
      if (disconnected || (cell.building === "home" && !m.serviced[i])) {
        const badge = document.createElement("span"); badge.className = "plot-alert";
        badge.textContent = disconnected ? "단절" : "서비스"; b.append(badge);
      }
    }
    b.onclick = event => {
      if (cell.building) preview(i);
      else {
        build(i);
        if (event.detail === 0 && state.outcome === "playing") {
          const next = state.board.findIndex((c, j) => j > i && c.terrain === "land" && !c.building);
          const fallback = state.board.findIndex(c => c.terrain === "land" && !c.building);
          if (next >= 0 || fallback >= 0) $("city").children[next >= 0 ? next : fallback].focus();
        }
      }
    };
    b.onpointerenter = b.onfocus = b.onpointerleave = b.onblur = refreshPreview;
    $("city").append(b);
  });
  $("offers").replaceChildren(...offers(state).map((type, i) => {
    const data = BUILDINGS[type], button = document.createElement("button");
    button.className = "offer" + (selected === i ? " selected" : "");
    button.disabled = done || state.budget < data.cost;
    button.setAttribute("aria-pressed", String(selected === i));
    const left = document.createElement("div"), n = document.createElement("strong"), desc = document.createElement("small"), cost = document.createElement("span");
    n.textContent = data.name; desc.textContent = data.desc; left.append(n, desc);
    cost.textContent = data.cost + " COINS"; button.append(left, cost);
    button.onclick = () => { selected = i; render(); $("offers").children[i].focus(); };
    return button;
  }));
  $("forecast").textContent = [1, 2, 3].filter(n => state.turn + n < MAX_TURNS).map(n => "다음 " + n + "턴: " + offers({ ...state, turn: state.turn + n }).map(t => BUILDINGS[t].name).join(" / ")).join(" · ");
  $("pass").disabled = done;
  if (!done) {
    const next = pass(state);
    $("pass").textContent = "건설 쉬기 · 예산 " + signed(next.budget - state.budget) + " · 신뢰 " + signed(next.trust - state.trust);
  }
  refreshPreview();
  records();
  $("endgame").hidden = !done;
  if (done) showResult();
}
function refreshPreview() {
  const city = $("city"), active = document.activeElement;
  const focused = city.contains(active) && active.matches(".plot:not(:disabled)") ? active : null;
  const target = focused || city.querySelector(".plot:hover:not(:disabled)");
  // Resolve against the current board so delayed events from replaced plots cannot reset it.
  preview(target ? Array.from(city.children).indexOf(target) : undefined);
}
function preview(index) {
  if (state.outcome !== "playing") { $("preview").textContent = state.reason; return; }
  const type = offers(state)[selected], b = BUILDINGS[type];
  let message = b.name + " · 비용 " + b.cost + " · " + b.desc;
  if (Number.isInteger(index)) {
    const cell = state.board[index], m = evaluateCity(state);
    if (cell.building) message = BUILDINGS[cell.building].name + " · " + (m.connected[index] ? "중앙 도로 연결" : cell.building === "park" ? "공원은 도로 없이 환경·인접 서비스 제공" : "도로 단절") + (cell.building === "home" ? m.serviced[index] ? " · 생활 서비스 있음" : " · 공원 인접 또는 연결·가동 진료소(거리 2) 필요" : "");
    else if (cell.terrain === "land") {
      try {
        const next = place(state, index, selected), n = evaluateCity(next);
        message = b.name + " 건설·턴 정산 후: 예산 " + next.budget + " (" + signed(next.budget - state.budget) + ") · 신뢰 " + next.trust + " (" + signed(next.trust - state.trust) + ") · 전력 " + n.supply + "/" + n.need + " · 서비스 " + n.served + "/" + n.population + " · 혼잡 " + n.traffic + " · 환경 " + n.environment;
        if (next.lastTurn.checkpoint) message += next.lastTurn.checkpoint.met ? " · 점검 통과" : " · 점검 미달";
        if (next.outcome !== "playing") message += " · " + next.reason;
      } catch (e) { message = e.message; }
    }
  }
  $("preview").textContent = message;
}
function showResult() {
  $("endgame").replaceChildren();
  const h = document.createElement("h2"), p = document.createElement("p"), retry = document.createElement("button");
  h.textContent = (state.outcome === "won" ? "임무 성공" : "계획 재검토") + " · " + evaluateCity(state).score + " PT";
  p.textContent = state.reason + " " + (goals(state).filter(g => !g.met).map(g => g.label).join(" · ") || "다음 시나리오에서도 균형을 지켜보세요.");
  retry.textContent = "같은 조건으로 다시 도전";
  retry.onclick = () => newGame(state.seed, state.scenario);
  $("endgame").append(h, p, retry);
  if (state.outcome === "won") {
    const ids = Object.keys(SCENARIOS), nextId = ids[ids.indexOf(state.scenario) + 1];
    if (nextId) {
      const next = document.createElement("button"); next.textContent = "다음 임무 · " + SCENARIOS[nextId].name;
      next.onclick = () => newGame(state.seed, nextId); $("endgame").append(next);
    }
  }
}
function update(next) {
  state = next;
  if (state.outcome !== "playing") {
    record.history.push({ version: RULE_VERSION, scenario: state.scenario, outcome: state.outcome, seed: state.seed, score: evaluateCity(state).score, date: new Date().toISOString() });
    record.history = record.history.slice(-10); record.current = null; resumeState = null;
  } else {
    record.current = { version: RULE_VERSION, scenario: state.scenario, seed: state.seed, actions: state.actions };
    resumeState = state;
  }
  $("resume").hidden = true;
  save();
  const choices = offers(state);
  selected = Math.max(0, choices.findIndex(type => BUILDINGS[type].cost <= state.budget));
  const last = state.lastTurn;
  $("status").textContent = "수입 " + last.income + " − 유지비 " + last.upkeep + " · 신뢰 " + signed(last.trustDelta) + (last.debt ? " · 미지급 비용 " + last.debt + " (비용당 신뢰 −3)" : "") + (last.event ? " · " + SCENARIOS[state.scenario].event.name + " 시작" : "") + (last.checkpoint ? last.checkpoint.met ? " · 점검 통과: 예산 +4" : " · 점검 미달: 신뢰 −12" : "");
  render();
}
function build(index) {
  if (state.outcome !== "playing") return;
  try { update(place(state, index, selected)); } catch (e) { $("status").textContent = e.message; }
}
$("pass").onclick = () => { if (state.outcome === "playing") update(pass(state)); };
function newGame(seed, scenario = $("scenario").value) {
  if (state && state.turn > 0 && state.outcome === "playing" && !confirm("진행 중인 도시 대신 새 도시를 시작할까요?")) return;
  record.current = null; resumeState = null; $("resume").hidden = true; save(); start(seed, scenario);
}
$("new-city").onclick = () => newGame(freshSeed());
$("apply-seed").onclick = () => { try { newGame(cleanSeed($("seed").value)); } catch (e) { announce(e.message); } };
$("resume").onclick = () => {
  if (resumeState) {
    state = resumeState; selected = 0; $("scenario").value = state.scenario; $("resume").hidden = true; render();
    $("status").textContent = "행동 기록을 현재 규칙으로 재생해 도시를 이어갑니다.";
  }
};
$("clear").onclick = () => {
  if (confirm("이 브라우저의 도시 기록과 저장된 진행을 삭제할까요?")) {
    record = { history: [], current: null }; resumeState = null; $("resume").hidden = true; save(); start(); announce("내 도시 기록을 삭제했습니다.");
  }
};
tool("start_city", "새 도시 시작 · 진행 중 판 초기화", {
  type: "object", properties: { seed: { type: "string", maxLength: 40 }, scenario: { type: "string", enum: Object.keys(SCENARIOS) } }, required: ["seed"], additionalProperties: false,
}, input => {
  const seed = cleanSeed(input?.seed), scenario = input?.scenario ?? "foundations";
  if (!Object.hasOwn(SCENARIOS, scenario)) throw Error("Invalid scenario");
  record.current = null; resumeState = null; $("resume").hidden = true; save(); start(seed, scenario);
  return { seed: state.seed, scenario: state.scenario, version: RULE_VERSION, turn: state.turn, budget: state.budget };
});
start();
if (storageMessage) announce(storageMessage);
