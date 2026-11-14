# Blobz, Claude Code Operating Standard

Auto-loaded when working under `blobz/`. **Blobz is a separate game from the rest of this repo.**
For anything inside `blobz/`, this file replaces the repo-root `CLAUDE.md` (Asset Report rules,
guild/combat core, art reconcile, root PROGRESS.md backfill do NOT apply here).
Stefan works phone-only; replies in Swedish or English, docs and code in English.

## 10. The game
- **Pitch:** co-op party game for 1-5 players on phones over the same Wi-Fi. Kids (8+) and adults
  play together. Inspirations: Mario Party (short co-op moments), Brawl Stars (thumb controls,
  readable top-down arena), Minecraft (gather, build base).
- **Camera:** top-down or slight 3/4, simple but clean graphics.
- **Blobz:** each player is a blob that **glides/slides** around (hover-skate feel, momentum and
  a little drift). Blobz never roll. Skins: color, hat, eyes.
- **Core loop:** explore the map, collect resources (wood, stone, crystal), bring them home to the
  shared base, build/upgrade base totems that grant **team powerups**. Field powerups are simple
  readable icons.
- **Co-op moments:** pressure plates needing N blobz at once, push heavy blocks (faster with more
  pushers), two-blob carry, defend base from slime waves, revive a downed friend.
- **Score:** one shared team score, 1-3 stars per level. No PvP damage.
- **Kid-safe design:** one thumbstick + one action button, no reading required to play, auto-revive,
  no fail state that ends the round early for one player, no chat, no accounts.

## 20. Tech (decided)
- **Engine:** Phaser 3 (MIT) + TypeScript + Vite. Runs in the phone browser, installable as PWA.
- **Network:** PeerJS (WebRTC). One phone hosts and runs the authoritative sim; others join with a
  4-letter room code and send inputs only. Signaling needs internet once; gameplay traffic is
  peer-to-peer over the local Wi-Fi. Max 5 players.
- **Graphics:** open-licensed assets only, CC0 preferred (Kenney). Vendor files under
  `blobz/public/assets/` with a `LICENSES.md` listing source + license per pack. Blobz themselves are
  drawn in code (cheap skins).
- **Self-contained:** everything lives in `blobz/` with its own `package.json`. Never import from or
  modify `web/`, `app/` or other Asset Report code. Only shared touch point: the Pages workflow
  builds `blobz/` and serves it at `/Game/blobz/` (main) and `/Game/dev/blobz/` (dev).

## 25. Reply first, then work
- Before any tool call, answer Stefan in 1-3 lines: what you understood, what you will do, any
  question that blocks it. Only then start working. Long jobs: post short status lines along the way.

## 27. Team (Lead / Art / Code)
- This session is **Lead**: talks with Stefan, tests, reviews, merges Art/Code branches into the deploy
  branch, bumps `VERSION`, deploys. Art and Code run in separate Claude Code sessions.
- Roles, branches, file ownership and definition of done: [`docs/TEAM.md`](./docs/TEAM.md).
- **New Lead chat:** start by reading [`docs/LEAD_HANDOVER.md`](./docs/LEAD_HANDOVER.md) (live state, session ids); update it before ending.
- Decision board (artifact): https://claude.ai/artifact/7pHh1Z6QmDvtAYWweGvkAL (source `docs/decisions/`). Post questions/options as
  `questions/<id>` docs (ArtifactData), read his picks/comments from `answers/<id>`, and set `decision` on the question when acted on.
  Graphic questions always come with picture options. After reading an answer set `decision` (moves it to the archive) or
  `followup` (a clarifying question, keeps it open). Keep `work` (Pågående) and `backlog` up to date; read `prio` + `comments`.
- When a decision or clarification from Stefan is needed (or he drifts to a new topic while a question is open), ask with the AskUserQuestion tool instead of waiting in prose.
- Every message that announces a new version includes the link https://sluborg.github.io/Game/ and the version number.
- Every reply where the decision board has something new (a new question, a followup, a changed Pågående row Stefan should see) includes the board link https://claude.ai/artifact/7pHh1Z6QmDvtAYWweGvkAL.
- Art made in code is only for simple shapes (icons, tiles, UI, small fx, blob parts). Illustrations (class cards,
  buildings, characters, scenes) are ordered from ChatGPT with a prompt Stefan can paste (see docs/TEAM.md).
- Art pipeline for non-trivial art: Art makes 3 rough SVG/PNG variants -> board question with pictures -> Stefan picks
  -> Art writes a ChatGPT prompt from the pick -> Stefan runs it -> Art slices and integrates.
- **ChatGPT art queue = `docs/ART_ORDERS.md`** (ChatGPT reads it from GitHub raw on every "next"). Every new order,
  status change (READY/WAITING/DONE) or prompt fix goes into that file and is pushed to the deploy branch. Never ask
  Stefan to change ChatGPT's project instructions.
- **Art direction first, small orders:** Stefan prefers small direction tests (D-orders in ART_ORDERS.md) before any
  big ChatGPT order; big A-orders stay WAITING until the direction for their area is locked. Read ALL `answers/*`
  on the board (comments included) before planning or reporting art.
- Reporting to Stefan: only when a whole batch is merged and live (Art: a full part set; Code: a whole
  feature), or when a decision from him blocks work. No progress pings about single images or steps.

## 30. Workflow (light: changes go straight into the live game)
build -> verify -> push = live
1. **Build** in small conventional commits on the Blobz branch (`claude/mobile-game-5-players-8qthjq`).
2. **Verify** (build, tests, headless multi-player run) before every push.
3. **Push** to the Blobz branch: the Pages workflow deploys it to https://sluborg.github.io/Game/
   (Blobz temporarily borrows the Pages host; Asset Report main moves to `/Game/asset-report/`).
   No PR, no Codex, no review gates unless Stefan asks for them.
4. Big design changes (new mode, new milestone): one short plan reply first.
5. **Version:** `blobz/VERSION` is shown on the start screen. Bump it in every push: new feature or
   art = next number (`v017` -> `v018`), mini fix = add a letter (`v018` -> `v018b` -> `v018c`).

## 40. Milestones
| Order | Milestone | Done when |
|---|---|---|
| 10 | Lobby + glide | Host creates room, up to 4 join by code, all 5 blobz glide around one map in sync |
| 20 | Gather + base | Resources spawn, blobz carry them home, team score shows |
| 30 | Co-op moments | Pressure plates, heavy block, two-blob carry, 1-3 stars |
| 40 | Base totems + powerups | Spend resources on totems, team powerups, field powerups |
| 50 | Skins + levels | Skin picker in lobby, 3+ levels, slime waves |

## 50. Verify and visibility
- Confirm every change with `npm run build` and a headless Chromium run at phone width (390px)
  before reporting. Multiplayer: test with 2+ browser contexts in Playwright.
- Push screenshots to `blobz/docs/screenshots/` so Stefan can see them on GitHub mobile.
- Log each milestone gate in `blobz/PROGRESS.md` (date, branch, files, review verdict, open questions).
- Bottom-line-first summaries, files by path, no full code unless Stefan says "full file".

## 60. Hard stops
- No commits to `main` or `dev` (Blobz ships from its own branch).
- No changes outside `blobz/` except the Pages workflow entry (and the root CLAUDE.md pointer).
- No assets without a verified open license.
- No silent overwrite or delete.
