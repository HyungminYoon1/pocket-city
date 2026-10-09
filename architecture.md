# POCKET CITY architecture

Browser-only static GitHub Pages application. Public output is dist/ only.

- dist/src/model.js: pure deterministic generation, validation, rules, scoring and scenario feedback. No DOM/storage/network.
- dist/src/campaign.js: pure record normalization, bounded replay witnesses, independent achievement counting and next-mission recommendation. No DOM/storage/network.
- dist/src/app.js: DOM rendering, inputs and session lifecycle. Uses model functions; no DB or remote calls.
- dist/src/core.js: seeded RNG, bounded input validation, feature-detected WebMCP, device-local storage helpers.
- dist/src/storage.js: bounded private-record localStorage boundary. Replays through campaign.js before reading/writing records; catches blocked storage and quota failures.
- dist/src/progress.js: minimal device-local gallery summary boundary. No private run payload, identity or network.
- test/: deterministic Node model tests; not a replacement for browser gameplay QA.
- tools/: loopback preview and static checks; .github/: pinned Pages deployment.

## Local retention and replay

Private key `pocket-city-v1` keeps the recent 10 completion metadata entries, one playing v2 replay, and at most one first verified v2 victory witness per each of the existing three scenarios. Witnesses contain only version, scenario, code and at most 20 whitelisted legal actions. Achievements survive history eviction until explicit own-record reset or browser storage removal. Loading and writing replays witnesses and rejects incomplete, losing, illegal, mismatched-scenario or old-version inputs. Metadata-only v1/v2 history cannot establish an achievement and is not migrated into one. Existing valid v2 current replays remain exact; old-version current runs remain non-resumable. All scenarios stay directly selectable; recommendation advances from durable achievements, without adding locks.

Private JSON reads/writes are limited to 32,768 characters. Normalized records use ASCII keys/values. History dates come only from actual completions; achievement witnesses do not add timestamps. The UI never saves claimed snapshots or scores as achievement proof. Local replay verification is not server verification or tamper-resistant competition.

## Shared gallery summary

After an actual v2 victory and successful private-record write, `progress.js` read-modify-writes only `apps["pocket-city"]` at `web-lab-progress-v1`: `{version:1,apps:{[repoId]:{completed,total,updatedAt}}}`. Own completed count is recomputed from durable independent witnesses; total is 3, not runs played. Initial view, preview, loss and resume do not publish. `updatedAt` is the actual summary-write ISO time, never a fabricated historical date. No names, codes, actions, boards or file contents enter this aggregate.

The boundary accepts only version 1, exact fields, the 15 literal repo IDs in `progress.js`, integer `0 <= completed <= total <= 1000`, canonical ISO timestamps, and at most 8,192 input/output characters. Invalid JSON, unknown IDs, extra fields, oversized values and unavailable storage fail without replacing the existing aggregate. Other valid apps' entries are preserved. Reset removes only the game's private key and its own aggregate entry; malformed/unavailable aggregate deletion reports failure rather than discarding other records. Browser storage is scoped to origin: Pages paths on one origin share the aggregate, while different local preview ports do not.

Device-local progress is labeled and removable; no cloud persistence, identities or global leaderboard are implemented. No analytics, external AI APIs, accounts, audio or secrets. Runtime network blocked by CSP connect-src none. No ranking backend or adapter is added for this service.
