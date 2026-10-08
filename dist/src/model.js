import { rng, shuffle } from "./core.js";
export const SIZE = 5,
  MAX_TURNS = 20;
export const BUILDINGS = {
  home: { name: "주택", cost: 4, desc: "인구 +3 · 전력 수요 +2", symbol: "H" },
  shop: { name: "상점", cost: 5, desc: "일자리 +4 · 턴 수입 +1", symbol: "S" },
  park: {
    name: "공원",
    cost: 3,
    desc: "환경 +3 · 주변 주택 보너스",
    symbol: "P",
  },
  plant: { name: "발전소", cost: 4, desc: "전력 +6 · 환경 −4", symbol: "E" },
  road: { name: "도로", cost: 1, desc: "인접 주택에 추가 점수", symbol: "=" },
};
export function createCity(seed) {
  if (typeof seed !== "string" || seed.length > 40)
    throw new TypeError("Invalid city code");
  const r = rng(seed + "|city-v1"),
    water = shuffle(
      Array.from({ length: 25 }, (_, i) => i).filter((i) => i !== 12),
      r,
    ).slice(0, 3);
  return {
    seed,
    turn: 0,
    budget: 10,
    board: Array.from({ length: 25 }, (_, i) => ({
      terrain: water.includes(i) ? "water" : "land",
      building: i === 12 ? "road" : null,
    })),
    actions: [],
  };
}
export function offers(state) {
  return shuffle(
    Object.keys(BUILDINGS),
    rng(state.seed + "|offers|" + state.turn),
  ).slice(0, 3);
}
export function neighbors(i) {
  const out = [];
  const x = i % SIZE,
    y = Math.floor(i / SIZE);
  if (x > 0) out.push(i - 1);
  if (x < SIZE - 1) out.push(i + 1);
  if (y > 0) out.push(i - SIZE);
  if (y < SIZE - 1) out.push(i + SIZE);
  return out;
}
export function evaluateCity(state) {
  let population = 0,
    jobs = 0,
    supply = 0,
    need = 0,
    environment = 0,
    score = 0;
  for (let i = 0; i < state.board.length; i++) {
    const b = state.board[i].building,
      near = neighbors(i).map((j) => state.board[j]),
      count = (t) => near.filter((c) => c.building === t).length;
    if (b === "home") {
      population += 3;
      need += 2;
      score +=
        12 +
        count("park") * 5 +
        count("road") * 2 +
        near.filter((c) => c.terrain === "water").length * 2 -
        count("plant") * 8;
    }
    if (b === "shop") {
      jobs += 4;
      need++;
      score += 10 + count("home") * 4;
    }
    if (b === "park") {
      environment += 3;
      score += 7 + near.filter((c) => c.terrain === "water").length * 5;
    }
    if (b === "plant") {
      supply += 6;
      environment -= 4;
      score += 6;
    }
    if (b === "road") score++;
  }
  const shortage = Math.max(0, need - supply),
    unemployment = Math.max(0, population - jobs);
  score -= shortage * 3 + unemployment * 2;
  score += Math.max(0, environment) * 2;
  if (need > 0 && !shortage) score += 20;
  if (population > 0 && !unemployment) score += 15;
  return {
    population,
    jobs,
    supply,
    need,
    environment,
    shortage,
    unemployment,
    score: Math.max(0, score),
  };
}
export function place(state, index, offerIndex) {
  if (state.turn >= MAX_TURNS) throw Error("도시가 이미 완성되었습니다.");
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 25 ||
    !Number.isInteger(offerIndex) ||
    offerIndex < 0 ||
    offerIndex > 2
  )
    throw new TypeError("Invalid move");
  const cell = state.board[index];
  if (cell.terrain !== "land" || cell.building)
    throw Error("빈 땅에만 건설할 수 있습니다.");
  const type = offers(state)[offerIndex],
    building = BUILDINGS[type];
  if (state.budget < building.cost) throw Error("예산이 부족합니다.");
  const board = state.board.map((c, i) =>
    i === index ? { ...c, building: type } : { ...c },
  );
  const shopCount = board.filter((c) => c.building === "shop").length;
  return {
    ...state,
    board,
    budget: state.budget - building.cost + 2 + Math.min(3, shopCount),
    turn: state.turn + 1,
    actions: [...state.actions, { type: "place", index, offer: offerIndex }],
  };
}
export function pass(state) {
  if (state.turn >= MAX_TURNS) throw Error("도시가 이미 완성되었습니다.");
  return {
    ...state,
    budget: state.budget + 2,
    turn: state.turn + 1,
    actions: [...state.actions, { type: "pass" }],
  };
}
export function replay(seed, actions) {
  if (!Array.isArray(actions) || actions.length > MAX_TURNS)
    throw new TypeError("Invalid action log");
  let state = createCity(seed);
  for (const a of actions) {
    if (!a || typeof a !== "object") throw Error("Invalid action");
    if (a.type === "place") state = place(state, a.index, a.offer);
    else if (a.type === "pass") state = pass(state);
    else throw Error("Unknown action");
  }
  return state;
}
