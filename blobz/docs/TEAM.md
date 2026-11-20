# Blobz team
Stefan talks only to **Lead**. Everyone else is a Claude Code session on its own branch, plus two external art makers.
Sessions message each other with send_message. Status of record: docs/TEAM_STATUS.md.

| Role | Does | Branch / owns |
|---|---|---|
| Lead | talks to Stefan, plans, keeps the decision board, dispatches work, checks that approved things show in the game | blobz/CLAUDE.md, TEAM.md, PROGRESS.md, docs/screenshots |
| Art | runs docs/ART_ORDERS.md (ChatGPT queue), slices deliveries, contact point for HyperAgent | claude/blobz-art: public/art/**, scripts/**, blob.ts (Code may edit with Lead OK) |
| Code | meadow, menus, designer UI, building, net, DPR | claude/blobz-code: main.ts, sim.ts, game.ts, style.css, net.ts, index.html |
| Code 2 | dungeon rooms, enemies, FX | claude/blobz-dungeon: dungeon*.ts, e2e/dungeon*.cjs |
| Assistant | merges to deploy, runs checks, bumps VERSION, pushes, updates TEAM_STATUS.md, asks Test | the deploy branch only |
| Test | full e2e and live smoke after each version, reports to Lead | writes no code |
| ChatGPT | pixel art from ART_ORDERS.md when Stefan types "next" | none |
| HyperAgent agents | designer art (hats first) per docs/HYPERAGENT_BRIEF.md | branch hyperagent/*, folder docs/art-review/hyperagent/ only |

## Flow for art (an approved piece is NOT done until it shows in the game)
Art slices -> report with branch@sha -> Lead orders Assistant to merge assets/docs to deploy -> Lead orders Code/Code 2 to wire it -> Assistant merges -> Test verifies live -> Lead checks it in a screenshot and tells Stefan.

## Message rules
1. Always write branch@sha, and say "supersedes <sha>" when a newer one replaces an older one. The newest message from Lead wins.
2. Every task ends with a short report: what changed, files, how verified, sha, open questions. Do not message Stefan.
3. Never push to the deploy branch except Assistant. No PRs unless Lead asks.
4. Approved art must not sit unmerged: Art checks TEAM_STATUS.md at the start of every task.
5. External agents: Art is the only contact. Art runs `git fetch origin '+refs/heads/hyperagent/*:refs/remotes/origin/hyperagent/*'` at the start of every task and when Lead pings (the plain `hyperagent/*` form gives "invalid refspec"). If an agent cannot reach GitHub, Stefan relays files and Art records them in docs/art-review/hyperagent/.

## Appendix

### File ownership (avoid conflicts)
| Owner | Files |
|---|---|
| Art | `blobz/src/blob.ts`, `blobz/src/blob.test.ts`, `blobz/public/art/**`, `blobz/public/assets/**`, `blobz/docs/ART_*`, `blobz/docs/chatgpt-*`, `blobz/scripts/**` |
| Code | `blobz/src/main.ts`, `net.ts`, `sim.ts`, `sim.test.ts`, `game.ts`, `controls.ts`, `sfx.ts`, `art.ts`, `blobz/index.html`, `blobz/src/style.css`, new feature files |
| Code 2 | `blobz/src/dungeon*.ts`, `blobz/src/dungeon*.test.ts`, `blobz/e2e/dungeon*.cjs`; small, clearly marked hooks in shared files (main.ts, game.ts, sim.ts, net.ts, index.html, style.css) |
| Lead | `blobz/PROGRESS.md`, `blobz/CLAUDE.md`, `blobz/docs/TEAM.md`, `blobz/docs/screenshots/**` |
| Assistant | `blobz/VERSION`, `blobz/docs/TEAM_STATUS.md`, merges to the deploy branch |
| Test | no files |
| HyperAgent | `blobz/docs/art-review/hyperagent/` on `hyperagent/*` branches only |

If you must touch a file you don't own, keep the change minimal and say so in your report.

### Definition of done (every task, before you push)
1. `cd blobz && npm ci` (first time) then `npm run build` and `npm test` are green.
2. Headless Chromium (Playwright is preinstalled: `require('playwright')`), portrait 390x844. Look at the screenshot yourself. Landscape is parked: only check that the "Vänd telefonen" overlay shows.
3. Small conventional commits, pushed to your branch.
4. Your report includes a portrait screenshot of the real change and what you saw.
5. Finish with a short report: what changed, files, how you verified, sha, open questions. Do not bump `VERSION` (Assistant does on merge).

### Style rules (Art and Code)
- Blobz is a co-op party game for kids 8+ and adults; UI text in Swedish, code/docs in English.
- Pixel art: Ninja Adventure look (chunky, readable, 1 px dark outline), crisp pixels, no blur. The blob outline and features are `#141b1b` (INK in `src/blob.ts`); the plum `#3f2631` is the dungeon UI frame colour, not the blob outline.
- The blob sprite is a 20x20 grid (`GRID_W`/`GRID_H` in `src/blob.ts`), drawn 3x. Parts must fit all 6 body shapes.
- Readability first: high contrast, nothing that only works on one body color.
- Licences: CC0 or open-licensed packs with a `public/assets/LICENSES.md` entry, own art, and ChatGPT and HyperAgent art listed in `public/assets/LICENSES.md` with agent name and date.

### Art intake
- Illustrations (class cards, buildings, characters, scenes, loading art) come from ChatGPT or HyperAgent.
- Art's generator scripts are only for simple shapes (icons, tiles, UI frames, small fx, blob parts).
- The ChatGPT queue is docs/ART_ORDERS.md (one prompt per order, exact pixel grids, statuses TO DO / READY / WAITING / DONE).
- HyperAgent works from docs/HYPERAGENT_BRIEF.md and delivers on `hyperagent/*`.
- Art slices every delivery and lists it in docs/ASSET_INDEX.md.
