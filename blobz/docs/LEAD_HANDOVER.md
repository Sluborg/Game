# Lead handover (read this first in a new Lead chat)

Rules: `blobz/CLAUDE.md` (operating standard) and `blobz/docs/TEAM.md` (roles, branches, ownership). This file is the
live state; update it at the end of every Lead session.

## Communication (Stefan's top complaint)
- Reply first in 1-3 lines, then work. Post a one-line status before any job longer than ~2 minutes.
- Never wait silently on deploys or merges. Report each merged batch with version + link https://sluborg.github.io/Game/.
- Read ALL `answers/*` on the board (choice AND comment) before planning or reporting.

## Team sessions (talk via send_message; they cannot reach each other)
| Role | Session | Branch |
|---|---|---|
| Art | session_019PjhQv7Xfjv9fRCZgvquZ1 | `claude/blobz-art` |
| Code (base/meadow, i18n) | session_019PjhQvNgzNv3LAiBBHLhoY | `claude/blobz-code` |
| Code 2 (dungeon) | session_019PjhQxMPAQdpZt3g1GZEuX | `claude/blobz-dungeon` |
Lead merges into `claude/mobile-game-5-players-8qthjq` (deploy), bumps `blobz/VERSION` (commit it!), pushes.
Merge routine: fetch, merge each branch, resolve, `npx tsc --noEmit && npm test && npm run build && npm run e2e`, commit, push.

## Places
- Decision board "Blobz Board": https://claude.ai/artifact/7pHh1Z6QmDvtAYWweGvkAL (source `blobz/docs/decisions/index.html`,
  db collections questions/answers/work/backlog/prio/comments; Fredoka embedded as base64).
- ChatGPT art queue: `blobz/docs/ART_ORDERS.md` (ChatGPT project instructions point to its raw GitHub URL on the deploy branch).
  D-orders = small direction tests; A-orders stay WAITING until Stefan locks the direction for their area.

## Art decision (2026-11-14, LOCKED)
- ONE art source: Ninja Adventure (CC0), vendored in `public/assets/ninja-adventure/` (images; audio list in
  AUDIO_INDEX.txt, raw audio not vendored). Blobz are ours, redrawn on Ninja's 16 px grid, 3/4 view, 4 facings.
- `docs/ART_MAP.md` (Art) maps every game object to a Ninja file. ChatGPT orders are all cancelled.

## State at handover (2026-11-14, v041)
- Live: meadow gather + build menu at the house (no totems), Bärregn mini game, snow map, test dungeon with 4 classes
  (Helare/Rogue/Riddare/Skytt; EN Healer/Rogue/Tank/Marksman), level-up cards (no timer), loot roll/pass, SV+EN,
  blobz look where they move, Fredoka font, fine-res items/ground on the meadow.
- Art direction: meadow style B (cozy storybook) chosen. Stefan rejected all icon/button/skill/back-arrow variants:
  wants ONE consistent icon family at the fine resolution, ideally from a Kenney pack (kenney.nl gives 403 here;
  opengameart.org mirrors work). Art is making 3 small icon-family test sheets + an enemy options sheet for the board.
- Open board question: water (A Kenney 16 px / B Kenney 2x finer, Art recommends / C own free shore).
- ChatGPT: only D-1 (style probe) READY. Stefan sends results to Lead, Lead forwards to Art, Art writes the next D-test.
- In progress: Code: organic dirt yard under buildings (no hard outline, switchable off). Code 2: wire fine batch 2
  in the dungeon. Art: icon families + enemy sheet.
- Backlog: `blobz/docs/BACKLOG.md` (night temple, endless/expandable village, more mini games).
