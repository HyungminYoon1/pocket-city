import {
  $,
  freshSeed,
  cleanSeed,
  loadLocal,
  saveLocal,
  announce,
  tool,
} from "./core.js";
import {
  BUILDINGS,
  MAX_TURNS,
  createCity,
  offers,
  evaluateCity,
  place,
  pass,
  replay,
} from "./model.js";
const KEY = "pocket-city-v1";
const saved = loadLocal(KEY, {});
let record = {
    history: Array.isArray(saved?.history)
      ? saved.history
          .filter(
            (h) =>
              h &&
              typeof h.seed === "string" &&
              Number.isFinite(h.score) &&
              typeof h.date === "string",
          )
          .slice(0, 10)
      : [],
    current: saved?.current || null,
  },
  state,
  selected = 0,
  completed = false,
  resumeState = null;
try {
  if (record.current && record.current.seed && record.current.actions?.length) {
    resumeState = replay(
      cleanSeed(record.current.seed),
      record.current.actions,
    );
    if (resumeState.turn >= 20) resumeState = null;
  }
} catch {
  record.current = null;
}
$("resume").hidden = !resumeState;
function save() {
  if (!saveLocal(KEY, record))
    announce("이 브라우저에 도시 기록을 저장할 수 없습니다.");
}
function start(seed = freshSeed()) {
  state = createCity(cleanSeed(seed));
  selected = 0;
  completed = false;
  announce("");
  render();
}
function records() {
  $("history").replaceChildren();
  if (!record.history.length) {
    const p = document.createElement("p");
    p.textContent = "첫 도시를 완성하면 여기에 기록됩니다.";
    $("history").append(p);
  } else
    for (const h of [...record.history].sort((a, b) => b.score - a.score)) {
      const row = document.createElement("div");
      row.className = "history-row";
      const a = document.createElement("span"),
        b = document.createElement("strong");
      a.textContent = h.seed.slice(0, 16) + " · " + h.date.slice(0, 10);
      b.textContent = h.score + " PT";
      row.append(a, b);
      $("history").append(row);
    }
}
function showMetrics(m) {
  $("budget").textContent = state.budget;
  $("population").textContent = m.population;
  $("power").textContent = m.supply + " / " + m.need;
  $("environment").textContent = m.environment;
  $("score").textContent = m.score;
  for (const [id, yes, text] of [
    ["goal-pop", m.population >= 12, "인구 12명 이상"],
    ["goal-power", m.need > 0 && m.shortage === 0, "전력 자립"],
    ["goal-green", m.environment >= 12, "환경 지수 12 이상"],
  ]) {
    $(id).textContent = (yes ? "● " : "○ ") + text;
    $(id).classList.toggle("done", yes);
  }
}
function render() {
  const m = evaluateCity(state);
  showMetrics(m);
  $("turn").textContent = String(Math.min(20, state.turn + 1)).padStart(2, "0");
  $("seed").value = state.seed;
  $("city-name").textContent =
    "CITY PLAN / " + state.seed.slice(0, 18).toUpperCase();
  $("city").replaceChildren();
  state.board.forEach((cell, i) => {
    const b = document.createElement("button");
    b.className =
      "plot " + (cell.terrain === "water" ? "water" : cell.building || "empty");
    b.disabled = completed || cell.terrain === "water" || !!cell.building;
    b.setAttribute(
      "aria-label",
      Math.floor(i / 5) +
        1 +
        "행 " +
        ((i % 5) + 1) +
        "열 " +
        (cell.terrain === "water"
          ? "강"
          : cell.building
            ? BUILDINGS[cell.building].name
            : "빈 땅"),
    );
    if (cell.building) {
      const block = document.createElement("span"),
        name = document.createElement("span");
      block.className = "building";
      block.textContent = BUILDINGS[cell.building].symbol;
      name.className = "plot-name";
      name.textContent = BUILDINGS[cell.building].name;
      b.append(block, name);
    }
    b.onclick = () => build(i);
    b.onpointerenter = b.onfocus = () => preview(i);
    b.onpointerleave = () => preview();
    $("city").append(b);
  });
  const available = offers(state);
  $("offers").replaceChildren(
    ...available.map((type, i) => {
      const data = BUILDINGS[type],
        button = document.createElement("button");
      button.className = "offer" + (selected === i ? " selected" : "");
      button.disabled = completed || state.budget < data.cost;
      button.setAttribute("aria-pressed", String(selected === i));
      const left = document.createElement("div"),
        n = document.createElement("strong"),
        desc = document.createElement("small"),
        cost = document.createElement("span");
      n.textContent = data.name;
      desc.textContent = data.desc;
      left.append(n, desc);
      cost.textContent = data.cost + " COINS";
      button.append(left, cost);
      button.onclick = () => {
        selected = i;
        render();
      };
      return button;
    }),
  );
  $("pass").disabled = completed;
  preview();
  records();
  $("endgame").hidden = !completed;
}
function preview(index) {
  if (completed) {
    $("preview").textContent =
      "도시가 완성되었습니다. 새로운 코드로 다시 도전해보세요.";
    return;
  }
  const type = offers(state)[selected],
    b = BUILDINGS[type];
  let message = b.name + " · 비용 " + b.cost + " · " + b.desc;
  if (
    Number.isInteger(index) &&
    state.board[index].terrain === "land" &&
    !state.board[index].building &&
    state.budget >= b.cost
  ) {
    const next = place(state, index, selected),
      delta = evaluateCity(next).score - evaluateCity(state).score;
    message += " / 이 땅에 건설하면 점수 " + (delta >= 0 ? "+" : "") + delta;
  }
  $("preview").textContent = message;
}
function finish() {
  completed = true;
  const m = evaluateCity(state);
  record.history.push({
    seed: state.seed,
    score: m.score,
    date: new Date().toISOString(),
    population: m.population,
    environment: m.environment,
  });
  record.history = record.history.slice(-10);
  record.current = null;
  resumeState = null;
  $("resume").hidden = true;
  save();
  render();
  $("endgame").replaceChildren();
  const h = document.createElement("h2"),
    p = document.createElement("p"),
    b = document.createElement("button");
  h.textContent = "도시 완성 · " + m.score + " PT";
  p.textContent =
    "인구 " +
    m.population +
    "명 · 일자리 " +
    m.jobs +
    "개 · 전력 " +
    m.supply +
    "/" +
    m.need +
    " · 환경 " +
    m.environment;
  b.textContent = "새 도시 만들기";
  b.onclick = () => start();
  $("endgame").append(h, p, b);
  $("endgame").hidden = false;
  $("status").textContent = m.shortage
    ? "다음 도시에서는 발전소와 수요의 균형을 맞춰보세요."
    : m.unemployment
      ? "전력은 충분합니다. 다음에는 일자리도 늘려보세요."
      : "도시의 균형을 잘 관리했습니다. 다른 타일 조합에도 도전해보세요.";
}
function update(next) {
  state = next;
  record.current = { seed: state.seed, actions: state.actions };
  resumeState = state;
  $("resume").hidden = true;
  save();
  if (state.turn >= MAX_TURNS) {
    finish();
    return;
  }
  const choices = offers(state);
  selected = Math.max(
    0,
    choices.findIndex((type) => BUILDINGS[type].cost <= state.budget),
  );
  render();
}
function build(index) {
  if (completed) return;
  try {
    const type = offers(state)[selected];
    const next = place(state, index, selected);
    $("status").textContent =
      BUILDINGS[type].name + " 건설 완료. 다음 턴의 건물을 골라보세요.";
    update(next);
  } catch (e) {
    $("status").textContent = e.message;
  }
}
$("pass").onclick = () => {
  if (!completed) {
    $("status").textContent =
      "이번 턴은 건설을 쉬었습니다. 예산이 2 늘었습니다.";
    update(pass(state));
  }
};
function newGame(seed) {
  if (
    state &&
    state.turn > 0 &&
    !completed &&
    !confirm("진행 중인 도시 대신 새 도시를 시작할까요?")
  )
    return;
  record.current = null;
  resumeState = null;
  $("resume").hidden = true;
  save();
  start(seed);
}
$("new-city").onclick = () => newGame(freshSeed());
$("apply-seed").onclick = () => {
  try {
    newGame(cleanSeed($("seed").value));
  } catch (e) {
    announce(e.message);
  }
};
$("resume").onclick = () => {
  if (resumeState) {
    state = resumeState;
    selected = 0;
    completed = false;
    $("resume").hidden = true;
    render();
    $("status").textContent = "진행 중이던 도시를 이어갑니다.";
  }
};
$("clear").onclick = () => {
  if (confirm("이 브라우저의 도시 기록과 저장된 진행을 삭제할까요?")) {
    record = { history: [], current: null };
    resumeState = null;
    $("resume").hidden = true;
    save();
    start();
    announce("내 도시 기록을 삭제했습니다.");
  }
};
tool(
  "start_city",
  "새 도시 시작 · 진행 중 판 초기화",
  {
    type: "object",
    properties: { seed: { type: "string", maxLength: 40 } },
    required: ["seed"],
    additionalProperties: false,
  },
  (input) => {
    const next = cleanSeed(input?.seed);
    record.current = null;
    resumeState = null;
    $("resume").hidden = true;
    save();
    start(next);
    return { seed: state.seed, turn: state.turn, budget: state.budget };
  },
);
start();
