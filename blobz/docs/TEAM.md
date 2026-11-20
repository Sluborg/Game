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
5. External agents: Art is the only contact. Art runs git fetch origin 'hyperagent/*' at the start of every task and when Lead pings. If an agent cannot reach GitHub, Stefan relays files and Art records them in docs/art-review/hyperagent/.
