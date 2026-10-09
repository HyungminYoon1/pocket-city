// Bounded local design probe, not a proof that every city is solvable.
import { createCity, offers, place, pass, evaluateCity, SCENARIOS, BUILDINGS } from "../dist/src/model.js";
const seed = process.argv[2] || "lesson";
const width = 600;
for (const scenario of Object.keys(SCENARIOS)) {
  const goal = SCENARIOS[scenario];
  let beam = [createCity(seed, scenario)], winner, best;
  const rank = s => {
    const m = evaluateCity(s);
    const room = s.board.filter((c, i) => c.terrain === "land" && !c.building && m.connected[i]).length;
    return Math.min(goal.population, m.population) * 14 + Math.min(goal.population, m.jobs) * 8
      + Math.min(goal.population, m.served) * 7 + Math.min(goal.population + (scenario === "transit" ? 6 : 0), m.capacity) * 1.5
      + Math.min(12, m.supply) * 2 + Math.min(goal.green, m.environment) * 2 + Math.min(8, room) * 2
      + s.trust * .8 + Math.min(s.budget, 20) * .3 - m.shortage * 9 - m.isolated * 15
      - m.unemployment * 4 - m.traffic * 5 - Math.max(0, m.population - m.served) * 3 - m.exposed * 3;
  };
  for (let t = 0; t < 20; t++) {
    const choices = [];
    for (const s of beam) {
      if (s.outcome !== "playing") continue;
      const m = evaluateCity(s);
      offers(s).forEach((type, offer) => {
        if (s.budget < BUILDINGS[type].cost) return;
        if (type === "home" && m.population >= goal.population) return;
        if (type === "shop" && m.jobs >= goal.population) return;
        if (type === "plant" && m.supply >= 12) return;
        s.board.forEach((c, index) => {
          if (c.terrain !== "land" || c.building || (type !== "park" && !m.connected[index])) return;
          choices.push(place(s, index, offer));
        });
      });
      choices.push(pass(s));
    }
    winner = choices.find(s => s.outcome === "won");
    if (winner) break;
    choices.sort((a, b) => rank(b) - rank(a));
    best = choices[0] || best;
    const seen = new Set();
    beam = choices.filter(s => {
      if (s.outcome !== "playing") return false;
      const key = s.board.map(c => c.building || ".").join("|") + "|" + s.budget + "|" + s.trust;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, width);
    if (!beam.length) break;
  }
  const s = winner || best;
  console.log(JSON.stringify({ seed, scenario, foundWin: !!winner, turn: s?.turn, trust: s?.trust, budget: s?.budget, metrics: s && evaluateCity(s), actions: s?.actions }));
}
