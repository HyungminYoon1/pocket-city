# Systematic edge-case audit — 2026-10-13

LOCAL ONLY. This is a new systematic audit, separate from the earlier guide/copy maintenance on the same date. No commit, push, deployment, remote CI run, gallery/ranking-server changes or external services.

## Source inventory and authority

- Named repository `pocket-city`: VERIFIED inventory, clean starting main worktree; baseline HEAD `dd98f789053871211e0011ba7fe14c4acc48b8bd`.
- VERIFIED full reads: architecture.md > README.md, docs/decisions.md, package.json, .github/workflows/pages.yml, .gitattributes, .gitignore; all dist/src modules (app.js, core.js, model.js, campaign.js, storage.js, progress.js); all existing test files and relevant fixtures; tools/check.mjs and serve.mjs. No api-spec.md or requirements.md was present. User-supplied AGENTS instructions applied.
- VERIFIED current HTML control inventory; CSS PARTIAL (relevant responsive/focus/overflow selectors and source portions selected for browser QA, not a complete stylesheet audit). docs/verification.md PARTIAL: current/latest evidence and relevant prior coverage read, historical deployment sections not reverified. Favicon/Git internals/generated caches are inventoried, content NOT_INSPECTED.
- Existing ignored `.qa/output/playwright/qa-20261013/qa.cjs`: VERIFIED and reused as primary flow in tracked tools/edge-browser.cjs. New edge assertions extend it. Root output/playwright/implement-20261012/package.json VERIFIED exists (Playwright1.61.1); specified Chrome executable VERIFIED by actual launch. Other root QA tools only inventoried. Sibling repositories, gallery and ranking server NOT_INSPECTED/NOT_MODIFIED by this owner.
- Feature boundaries accounted for: 3 scenarios; offers/water/road connectivity/economy/service/trust/pressure, turn 8/14 checkpoints, turn 11 event, turn 20 terminal goals, previews/focus, replay resume, history 10/durable witnesses 3, clear/recommendation.

## Executable boundary matrix

N = new pure test in test/edge.test.js; U = actual app callbacks in test/ui.test.js with DOM/storage doubles; E = existing named tests retained; B = tools/edge-browser.cjs actual Chrome. All executed entries below VERIFIED/PASS; doubles/injection are labeled and do not establish physical-device or production evidence. `npm test` runs N/U/E; B is separate and NOT executed by the current CI workflow.

| Feature/boundary | Cases mapped to actual tests / observations | Evidence |
| --- | --- | --- |
| Build input/affordability | NEW baseline PASS: `edge: build bounds and exact affordability reject without mutating the city` (plots 0/24 fixture, 25, -0.001, strings, empty, null, NaN/Inf; offer 0..2/3; budget 1 succeeds, 0 rejects). Existing occupied/water rejection. | N + E |
| Replay/restore/terminal | NEW baseline PASS: `edge: every prefix of each victory restores exactly and terminal replay rejects one extra action`: all 20 prefixes of each of 3 witnesses, playing/terminal record restoration, terminal + one action rejected. Existing 150 legal simulations. | N + E |
| Pressure numerical boundary | NEW baseline PASS: `edge: pressure grace ends at 5 and service grace ends at 7 using a numerical fixture` gives pressure 0/3/3/4 at turns 4/5/6/7; fixture expressly synthetic board, not a legal run witness. | N |
| Event/min/max/late | NEW baseline PASS: `edge: all scenario event boundaries distinguish 10, 11 and 12 without repeating activation`, no-home heat/transit demand stays 0. Existing checkpoint rewards, trust 0 early loss, max 100, unpaid debt and turn 20 loss. | N + E |
| Determinism/scoring/oracle | NEW baseline PASS: `edge: offers are unaffected by unrelated evaluation and replay requests`; code length 40 and empty replay. Existing 300 generated cities, 150 legal simulations, fixture victories fixed score/budget/trust. BFS road tests and hand pressure fixtures are independent expectations; all-code solvability NOT_PROVED. | N + E |
| Cancel/reset | NEW baseline PASS UI: `edge: cancelled replacement and erase retain the playing replay and summary`. Existing failed-clear preservation. Browser actual dismiss for new-city and erase, actual subsequent new game. | U + B |
| Repeated/late UI | RED->GREEN `edge: a detached plot click after reset cannot construct in the replacement city`. NEW baseline PASS `edge: repeated terminal actions never append completion history or rewrite the summary`. Existing detached blur/leave preview tests; browser detached-click fixture followed by real UI replacement. | U + B |
| Storage and import | NEW baseline PASS `edge: private read exact character limit and readback preserve peer keys` at 32768/32769; existing malformed/denied/quota/old versions. Browser quota preserves raw replay and summary, actual erase preserves peer data. File import/export and undo N/A (game has no demolition/undo). | N + E + B |
| UI keyboard/focus/mobile | Existing focus/hover/delayed preview tests; new regression confirms real callback keyboard-focus advance after a legal build. Browser focus preview, 1440/390/320 city/failure screens; all three UI victories, 11-turn garden reload. | U + B |
| Async and hints/no solution | Remote async and hint assistance state N/A: synchronous local game. Bounded balance probe failure is not proof of impossible city. Actual mobile hardware/IME and cross-tab last-writer races NOT_RUN. | N/A / NOT_RUN |

## Failures before / fixes after

Unchanged app + `node --test --test-name-pattern='edge:' test/ui.test.js`: obsolete plot callback after replacement expected turn `01`, actual `02`. Test fixture initially referenced an await-initialized plan before readiness; moved that fixture read ahead of test registration and re-ran unchanged app: 2 PASS / 1 genuine FAIL. Same command after guard: 3/3 PASS. No assertion was weakened.

Minimal fix: Ignore plot callbacks whose element is no longer contained in the current city board. No legitimate assertion was relaxed. 6 new pure tests passed on unchanged production code; these are coverage additions, **not RED_GREEN**. Total 9 new executable Node tests: 1 genuine failing regressions, 8 baseline-passing additions (including UI sequence checks). Existing 34 tests retained.

The browser harness had trial issues with async-status readiness and a collapsed erase control; corrected waits/visible-control navigation without changing product expectations. Those are harness issues, not product bugs or additional RED_GREEN claims.

## Commands and local results

- `node --test test/edge.test.js`: baseline 6/6 PASS before app edits.
- `node --test --test-name-pattern='edge:' test/ui.test.js`: original failures described above; same regression test executable after fix PASS.
- `npm test`: 43/43 PASS, fail0. `npm run check`: PASS. No test/workflow/dependency command changed.
- `git diff --check`: PASS at final handoff. Only edited text normalized UTF-8 without BOM / CRLF.
- Browser: start own persistent loopback server using `node tools/serve.mjs 0`; use emitted URL, then `node tools/edge-browser.cjs http://127.0.0.1:<port>/`. It resolves the already-installed root Playwright package (optional PLAYWRIGHT_MODULE_PATH path override), launches isolated headless Chrome at the requested executable with --mute-audio, and closes its owned context/browser in finally. Stop the owned preview session after completion. It never uses the personal Chrome profile.
- Existing workflow runs npm test/check on Node22 and includes all new Node tests. Browser harness retained in tools/ and runnable locally; CI browser execution NOT_RUN/not configured. Remote CI/live deployment NOT_RUN.

## Browser and visual evidence

Actual lesson UI victories: foundations 330, garden 326, transit 310. Garden turn 11 reload/resume exact budget, three achievements survive reload/loss. Primary flow 20 named checks plus additional edge assertions.

Additional flows include the new input/lifecycle regression, malformed or oversized imports where available, cancellation where available, explicit Storage.setItem quota failure injection with unchanged raw-record readback, and actual own-record erase preserving synthetic echo-vault/peer-private fixtures. Storage denial/quota in Node are test doubles; browser quota is deliberately injected, not a claim that physical disk quota was exhausted.

Evidence folder (already ignored): `.qa/output/playwright/edge-20261013/`. Artifacts: startup-1440/390/320.png; final-viewport-1440/390/320.png; garden-turn11-1440.png / garden-turn11-390.png / garden-turn11-320.png; foundations-victory.png / garden-victory.png / transit-victory.png; empty-city-failure-320.png. browser-report.json contains local outcomes/page errors/console logs. Node evidence baseline-tests.txt, regression-before.txt, regression-after.txt, final-tests-check.txt is local only. Actual 1440x1000 / 390x844 / 320x844 views and relevant full result states captured; screenshots reviewed separately from numeric horizontal-fit checks. Pages intentionally scroll; no fixed-shell fit guarantee is claimed. Observed tested page errors/console errors/warnings0.

UI **behavior** changed; HTML/CSS/layout did not. Parent screenshot refresh review recommended at the primary/result capture states above; no gallery screenshot changed here.

Exploratory mobile emulation also exercised touch/tap and mixed controls in two short interaction bursts: offer/plot touch construction, restart and a 20-turn terminal loss; explore-board-390.png and explore-terminal-detail-390.png. Observed exploratory page errors0; emulation is not physical mobile proof. Detailed chart/cost/terminal screenshots were separately reviewed at readable scale.

Runtime cleanup: final standalone harnesses closed their own Chrome/context in finally; exploratory contexts/browser explicitly closed. Four owned loopback listeners stopped after verification. An earlier interactive REPL timed out while a hidden erase control was being waited for; its initial handle was lost. Its process termination could not be independently confirmed from the reset REPL, so no ambiguous shared Chrome process was killed. Final self-closing CLI evidence supersedes that interrupted harness run.


## Decisions and integration limits

See D12 in decisions.md. Rules/versions, physics, mission predicates, scoring, storage keys/schemas/bounds/retention, 15-ID allowlist and separation of concerns retained. Browser fixtures use disposable contexts; no user records erased. Runtime code change is confined to dist/src/app.js.

All code solvability, exhaustive budget/trust forged in-memory states, real touch/IME/accessibility/engines and cross-tab RMW are NOT_RUN. Model APIs receive trusted generated state; saved replay inputs are validated separately. tools/balance.mjs read, expensive search NOT_RUN; existing fixed legal witnesses used.

All engines/devices/possible seeds or campaigns, measured learning efficacy, cross-origin gallery sharing and same-origin full gallery integration are NOT_RUN. Peer fixtures verify contract preservation, not sibling app UI integration. Shared storage is intentionally last-writer-wins; no atomic cross-tab or two-key transaction claim. No unsupported physics/logic/policy rule was repaired by changing its definition.

Changed files: dist/src/app.js; test/ui.test.js; new test/edge.test.js; new tools/edge-browser.cjs; docs/decisions.md; docs/verification.md; new docs/edge-cases-20261013.md. All changes uncommitted. Parent integrates/reviews/releases; this report provides no deployed/live assertion.

