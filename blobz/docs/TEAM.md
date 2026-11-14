# Blobz team: Lead, Art, Code, Code 2

Stefan talks only to **Lead**. Lead plans, tests, reviews, merges and deploys. Art and Code work in their own
Claude Code sessions on their own branches and never push to the deploy branch.

## ChatGPT art intake
Stefan may give ChatGPT-generated images directly to **Art**. Art judges them (style, cleanliness, fit), slices and
integrates them, and tells Lead whether a new ChatGPT round is needed and with which prompt changes.

## Branches
| Role | Branch | Pushes to |
|---|---|---|
| Lead | `claude/mobile-game-5-players-8qthjq` (deploy branch, GitHub Pages builds it) | itself |
| Art | `claude/blobz-art` | its own branch only |
| Code | `claude/blobz-code` | its own branch only (base building, meadow features) |
| Code 2 | `claude/blobz-dungeon` | its own branch only (dungeon mode) |

- Start every task by merging the latest deploy branch into your branch:
  `git fetch origin claude/mobile-game-5-players-8qthjq && git merge origin/claude/mobile-game-5-players-8qthjq`.
- Never push to `main`, `dev` or the deploy branch. Never open PRs. Lead merges.

## File ownership (avoid conflicts)
| Owner | Files |
|---|---|
| Art | `blobz/src/blob.ts`, `blobz/src/blob.test.ts`, `blobz/public/art/**`, `blobz/public/assets/**`, `blobz/docs/ART_*`, `blobz/docs/chatgpt-*`, `blobz/scripts/**` |
| Code | `blobz/src/main.ts`, `net.ts`, `sim.ts`, `sim.test.ts`, `game.ts`, `controls.ts`, `sfx.ts`, `art.ts`, `blobz/index.html`, `blobz/src/style.css`, new feature files |
| Code 2 | `blobz/src/dungeon*.ts`, `blobz/src/dungeon*.test.ts`, `blobz/e2e/dungeon*.cjs`; small, clearly marked hooks in shared files (main.ts, game.ts, sim.ts, net.ts, index.html, style.css) |
| Lead | `blobz/VERSION`, `blobz/PROGRESS.md`, `blobz/CLAUDE.md`, `blobz/docs/TEAM.md`, `blobz/docs/screenshots/**`, merges |

If you must touch a file you don't own, keep the change minimal and say so in your report.

## Definition of done (every task, before you push)
1. `cd blobz && npm ci` (first time) then `npm run build` and `npm test` are green.
2. Headless Chromium check of what you changed (Playwright is preinstalled: `require('playwright')`),
   phone portrait 390x844 and landscape 844x390. Look at the screenshots yourself.
3. Small conventional commits, pushed to your branch.
4. Finish with a short report: what changed, files, how you verified, open questions, screenshots paths.
   Do not bump `VERSION` (Lead does that on merge).

## Style rules (Art and Code)
- Blobz is a co-op party game for kids 8+ and adults; UI text in Swedish, code/docs in English.
- Pixel art: Kenney Tiny look, plum outline `#3f2631`, near-black features `#1b1018`, crisp pixels, no blur.
- Blob grid is 36x48 fine pixels (`S = 2` per design unit). Parts must fit all 6 body shapes.
- Readability first: high contrast, nothing that only works on one body color.
- Licenses: only CC0/own art, or Stefan's ChatGPT art (list it in `public/assets/LICENSES.md`).
