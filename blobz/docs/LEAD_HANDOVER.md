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
| Blobz Assistant (merge, Sonnet) | session_019PjhQugvaURfwPqVdqE1RT | deploy branch: Lead sends "merge <branch> <sha> as vNNN"; it merges, 404-checks, pushes, asks Test |
| Blobz Test (e2e, Sonnet) | session_019PjhQvKK6VUJYbrR6rPwfQ | runs full e2e on each live head, design critiques on request |
Lead merges into `claude/mobile-game-5-players-8qthjq` (deploy), bumps `blobz/VERSION` (commit it!), pushes.
Merge routine: fetch, merge each branch, resolve, `npx tsc --noEmit && npm test && npm run build && npm run e2e`, commit, push.

## Places
- Decision board "Blobz Board": https://claude.ai/artifact/7pHh1Z6QmDvtAYWweGvkAL (source `blobz/docs/decisions/index.html`,
  db collections questions/answers/work/backlog/prio/comments; Fredoka embedded as base64).
- ChatGPT art queue: `blobz/docs/ART_ORDERS.md` (ChatGPT project instructions point to its raw GitHub URL on the deploy branch).
  D-orders = small direction tests; A-orders stay WAITING until Stefan locks the direction for their area.

## State (2026-11-15, v048c live)
- Art: Ninja Adventure + ChatGPT N-orders (docs/ART_ORDERS.md). No Claude-drawn or Kenney art on screen. Every image
  indexed in docs/ASSET_INDEX.md (Art's scripts); unused files go to blobz/archive/art/ (not shipped).
- Archived behind flags: snow map, day cycle, Bärregn (pending), dungeon timers (pending). See docs/ARCHIVED.md.
- Outside reviews + Stefan's decisions: docs/reviews/ (README.md = decisions, PLAN.md = approved plan, steps 1-5).
- Plan approved 2026-11-15 night; Code (menus/meadow) and Code 2 (dungeon) implement it; each step -> one board rating.
- Rules added this session (see blobz/CLAUDE.md): discuss before a redo, reset rating on a changed item, Claude art
  only with OK, keep ChatGPT busy, every image indexed.
