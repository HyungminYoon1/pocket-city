import { rng, shuffle } from "./core.js";

export const RULE_VERSION = 2;
export const SIZE = 5, MAX_TURNS = 20;
export const BUILDINGS = {
  home: { name: "주택", cost: 4, desc: "인구 +3 · 전력 수요 +2 · 도로와 생활 서비스 필요", symbol: "H" },
  shop: { name: "상점", cost: 5, desc: "연결 시 일자리 +4 · 전력·주민 확보 시 수입 +2", symbol: "S" },
  park: { name: "공원", cost: 3, desc: "환경 +3 (물 옆 +2) · 인접 주택 서비스", symbol: "P" },
  plant: { name: "발전소", cost: 4, desc: "연결 시 전력 +6 · 환경 −3 · 유지비 1", symbol: "E" },
  clinic: { name: "진료소", cost: 5, desc: "연결 시 거리 2 이내 주택 서비스 · 전력·유지비 1", symbol: "+" },
  road: { name: "도로", cost: 1, desc: "중앙 도로와 이어야 연결 · 연결 도로당 통행 용량 +3", symbol: "=" },
};
export const SCENARIOS = {
  foundations: {
    name: "1 · 연결되는 동네", subtitle: "도로·전력·일자리를 연결하며 주민 9명을 정착시키세요.",
    population: 9, green: 0, served: 6, reserve: 2, trust: 35,
    event: { turn: 11, name: "정착 지원 종료", desc: "11턴부터 기본 수입 3 → 2. 상점 가동이 중요해집니다." },
    checkpoints: [{ turn: 8, population: 3, name: "첫 정착", hint: "인구 3 · 단절 0 · 전력 부족 0" }, { turn: 14, population: 6, name: "생활권 형성", hint: "인구 6 · 단절 0 · 전력 부족 0" }],
  },
  garden: {
    name: "2 · 폭염 속 정원 도시", subtitle: "발전소의 환경 비용과 공원·진료소의 생활 서비스를 함께 관리하세요.",
    population: 9, green: 6, served: 9, reserve: 3, trust: 45,
    event: { turn: 11, name: "폭염", desc: "11턴부터 주거 도시의 전력 수요 +2. 미리 발전 용량을 확보하세요." },
    checkpoints: [{ turn: 8, population: 3, name: "첫 정착", hint: "인구 3 · 단절 0 · 전력 부족 0" }, { turn: 14, population: 6, green: 0, name: "폭염 대응", hint: "인구 6 · 단절 0 · 전력 부족 0 · 환경 0 이상" }],
  },
  transit: {
    name: "3 · 출근길의 약속", subtitle: "인구 12명의 도시. 넓은 도로망과 생활권을 위한 땅을 남겨 두세요.",
    population: 12, green: 0, served: 9, reserve: 4, trust: 50,
    event: { turn: 11, name: "광역 통근 개시", desc: "11턴부터 통행 수요 +6. 연결 도로 2개 분량의 여유가 필요합니다." },
    checkpoints: [{ turn: 8, population: 3, name: "첫 정착", hint: "인구 3 · 단절 0 · 전력 부족 0" }, { turn: 14, population: 9, traffic: 0, name: "통근 점검", hint: "인구 9 · 단절 0 · 전력 부족 0 · 혼잡 0" }],
  },
};
export function neighbors(i) {
  const x = i % SIZE, y = Math.floor(i / SIZE), out = [];
  if (x > 0) out.push(i - 1);
  if (x < SIZE - 1) out.push(i + 1);
  if (y > 0) out.push(i - SIZE);
  if (y < SIZE - 1) out.push(i + SIZE);
  return out;
}
export function createCity(seed, scenario = "foundations") {
  if (typeof seed !== "string" || !/^[A-Za-z0-9-]{1,40}$/.test(seed)) throw new TypeError("Invalid city code");
  if (!Object.hasOwn(SCENARIOS, scenario)) throw new TypeError("Invalid scenario");
  const water = shuffle([0, 1, 3, 4, 5, 9, 15, 19, 20, 21, 23, 24], rng(seed + "|city-v2")).slice(0, 3);
  return {
    version: RULE_VERSION, seed, scenario, turn: 0, budget: 14, trust: 70,
    board: Array.from({ length: 25 }, (_, i) => ({ terrain: water.includes(i) ? "water" : "land", building: i === 12 ? "road" : null })),
    actions: [], checkpoints: [], lastTurn: null, outcome: "playing", reason: "",
  };
}
// Road is always available; the other five cards all appear within three turns.
export function offers(state) {
  const cycle = shuffle(["plant", "home", "shop", "park", "clinic"], rng(state.seed + "|cards-v2"));
  return ["road", cycle[(state.turn * 2) % 5], cycle[(state.turn * 2 + 1) % 5]];
}
export function evaluateCity(state) {
  const connectedRoads = new Set();
  if (state.board[12].building === "road") connectedRoads.add(12);
  const queue = [...connectedRoads];
  for (const i of queue) for (const j of neighbors(i)) {
    if (state.board[j].building === "road" && !connectedRoads.has(j)) { connectedRoads.add(j); queue.push(j); }
  }
  const connected = state.board.map((cell, i) => cell.building === "road" ? connectedRoads.has(i) : neighbors(i).some(j => connectedRoads.has(j)));
  const homes = [], clinics = [];
  let population = 0, linkedPopulation = 0, jobs = 0, supply = 0, need = 0, environment = 0, isolated = 0, shops = 0, upkeep = 0;
  state.board.forEach((cell, i) => {
    const b = cell.building;
    if (b && b !== "park" && !connected[i]) isolated++;
    if (b === "home") { population += 3; need += 2; homes.push(i); if (connected[i]) linkedPopulation += 3; }
    if (b === "shop") { need++; if (connected[i]) { jobs += 4; shops++; } }
    if (b === "plant") { environment -= 3; upkeep++; if (connected[i]) supply += 6; }
    if (b === "clinic") { need++; upkeep++; if (connected[i]) clinics.push(i); }
    if (b === "park") environment += 3 + (neighbors(i).some(j => state.board[j].terrain === "water") ? 2 : 0);
  });
  const eventActive = state.turn >= SCENARIOS[state.scenario].event.turn;
  if (eventActive && population && state.scenario === "garden") need += 2;
  const shortage = Math.max(0, need - supply);
  const distance = (a, b) => Math.abs(a % 5 - b % 5) + Math.abs(Math.floor(a / 5) - Math.floor(b / 5));
  let served = 0, exposed = 0;
  const serviced = state.board.map(() => false);
  for (const i of homes) {
    const near = neighbors(i), pollution = near.some(j => state.board[j].building === "plant");
    const clinic = !shortage && clinics.some(j => distance(i, j) <= 2);
    // A park supports a clean household; a clinic also protects plant-adjacent households.
    serviced[i] = connected[i] && (clinic || (!pollution && near.some(j => state.board[j].building === "park")));
    if (serviced[i]) served += 3;
    if (pollution && !clinic) exposed += 3;
  }
  const unemployment = Math.max(0, population - Math.min(jobs, linkedPopulation));
  const trafficDemand = linkedPopulation + (eventActive && population && state.scenario === "transit" ? 6 : 0);
  const capacity = connectedRoads.size * 3, traffic = Math.max(0, trafficDemand - capacity);
  const activeShops = shortage === 0 && linkedPopulation > 0 ? Math.min(shops, Math.ceil(linkedPopulation / 4)) : 0;
  const income = (state.scenario === "foundations" && !eventActive ? 3 : 2) + Math.min(3, activeShops) * 2;
  const netIncome = income - upkeep;
  // First four turns protect infrastructure planning; service/environment grace ends at six.
  const pressure = state.turn <= 4 ? 0 : Math.min(6, shortage) + isolated * 2 + Math.ceil(unemployment / 3) + Math.ceil(traffic / 3) + (state.turn <= 6 ? 0 : Math.ceil((population - served) / 3) + Math.ceil(exposed / 3) + Math.max(0, -environment));
  const score = Math.max(0, population * 8 + served * 3 + jobs * 2 + Math.max(0, environment) * 3 + connectedRoads.size - shortage * 5 - isolated * 8 - traffic * 3 - unemployment * 2 + state.trust + state.budget);
  return { population, linkedPopulation, jobs, supply, need, environment, shortage, unemployment, served, exposed, isolated, trafficDemand, capacity, traffic, income, upkeep, netIncome, pressure, activeShops, connected, serviced, score };
}
export function goals(state) {
  const m = evaluateCity(state), s = SCENARIOS[state.scenario];
  return [
    { label: `인구 ${s.population}명`, value: m.population, target: s.population, met: m.population >= s.population },
    { label: "단절·정전·실업·혼잡 모두 0", value: m.isolated + m.shortage + m.unemployment + m.traffic, target: 0, met: !m.isolated && !m.shortage && !m.unemployment && !m.traffic },
    { label: `생활 서비스 ${s.served}명`, value: m.served, target: s.served, met: m.served >= s.served },
    { label: `환경 ${s.green} 이상`, value: m.environment, target: s.green, met: m.environment >= s.green },
    { label: `예산 ${s.reserve} · 신뢰 ${s.trust} 이상`, value: `${state.budget} / ${state.trust}`, target: `${s.reserve} / ${s.trust}`, met: state.budget >= s.reserve && state.trust >= s.trust },
  ];
}
function settle(state, board, cost, action) {
  const next = { ...state, board, turn: state.turn + 1, actions: [...state.actions, action], checkpoints: [...state.checkpoints] };
  const m = evaluateCity(next), available = state.budget - cost + m.netIncome;
  const debt = Math.max(0, -available), trustDelta = 3 - m.pressure * 2 - debt * 3;
  next.budget = Math.max(0, available);
  next.trust = Math.max(0, Math.min(100, state.trust + trustDelta));
  const checkpoint = SCENARIOS[state.scenario].checkpoints.find(c => c.turn === next.turn);
  let checkpointResult = null;
  if (checkpoint) {
    const met = m.population >= checkpoint.population && !m.isolated && !m.shortage && (checkpoint.green === undefined || m.environment >= checkpoint.green) && (checkpoint.traffic === undefined || m.traffic <= checkpoint.traffic);
    checkpointResult = { turn: next.turn, name: checkpoint.name, met };
    next.checkpoints.push(checkpointResult);
    if (met) next.budget += 4;
    else next.trust = Math.max(0, next.trust - 12);
  }
  next.lastTurn = { income: m.income, upkeep: m.upkeep, debt, trustDelta: next.trust - state.trust, checkpoint: checkpointResult, event: next.turn === SCENARIOS[state.scenario].event.turn };
  if (!next.trust) { next.outcome = "lost"; next.reason = "주민 신뢰가 0이 되어 도시 의회가 계획을 중단했습니다."; }
  else if (next.turn === MAX_TURNS) {
    next.outcome = goals(next).every(g => g.met) ? "won" : "lost";
    next.reason = next.outcome === "won" ? "20턴 최종 심사의 모든 목표를 달성했습니다." : "20턴 최종 심사에서 미달한 목표가 있습니다.";
  }
  return next;
}
function assertPlaying(state) {
  if (state.outcome !== "playing" || state.turn >= MAX_TURNS) throw Error("종료된 도시입니다. 새 도시에 도전하세요.");
}
export function place(state, index, offerIndex) {
  assertPlaying(state);
  if (!Number.isInteger(index) || index < 0 || index >= 25 || !Number.isInteger(offerIndex) || offerIndex < 0 || offerIndex > 2) throw new TypeError("Invalid move");
  const cell = state.board[index];
  if (cell.terrain !== "land" || cell.building) throw Error("빈 땅에만 건설할 수 있습니다.");
  const type = offers(state)[offerIndex], building = BUILDINGS[type];
  if (state.budget < building.cost) throw Error("예산이 부족합니다. 쉬기도 수입·유지비·신뢰를 정산합니다.");
  const board = state.board.map((c, i) => i === index ? { ...c, building: type } : { ...c });
  return settle(state, board, building.cost, { type: "place", index, offer: offerIndex });
}
export function pass(state) {
  assertPlaying(state);
  return settle(state, state.board.map(c => ({ ...c })), 0, { type: "pass" });
}
export function replay(seed, actions, scenario = "foundations", version = RULE_VERSION) {
  if (version !== RULE_VERSION) throw new TypeError("이전 규칙의 저장 판은 재생할 수 없습니다.");
  if (!Array.isArray(actions) || actions.length > MAX_TURNS) throw new TypeError("Invalid action log");
  let state = createCity(seed, scenario);
  for (const a of actions) {
    if (!a || typeof a !== "object") throw Error("Invalid action");
    if (a.type === "place") state = place(state, a.index, a.offer);
    else if (a.type === "pass") state = pass(state);
    else throw Error("Unknown action");
  }
  return state;
}
