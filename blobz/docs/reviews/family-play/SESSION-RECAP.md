# Session recap · Remember what changed

The reviewed session ended after Storage was built and saved, but the result screen led with three empty stars and incomplete resource bars. This study makes the host's voluntary **Save and go home** action answer three family questions instead: What changed? How far did we get? What did we choose for next time?

![A keepsake unfurls through building, dungeon and next-outing memories](art/session-recap.gif)

## One-screen order

1. **Newest visible world change.** Lead with the last completed building, cottage upgrade, planted shortcut, discovered picnic or return project. Use a concrete result: “Built Storage · carry 4 now” or “Flower planted by the bridge.”
2. **Deepest dungeon room.** If the family entered the dungeon, retain the deepest room reached even after `leaveDungeon` clears `s.dg`. Show it beneath the world change, or as the headline when nothing changed in the meadow.
3. **Next invitation.** Prefer the project pinned at the cottage. Otherwise name the next uncompleted discovery clue, the next dungeon room after an early return, or “Choose an outing at the cottage.” Never manufacture a bigger resource bar as the only invitation.
4. **Earned milestones only.** On a voluntary long-game exit, render exactly `min(3, goal)` gold stars. With zero milestones, remove the star row entirely. Do not replace zero earned stars with empty outlines.
5. **Details stay secondary.** Delivered wood and berries may sit behind “Session details,” but incomplete bars must not outrank a saved building or landmark.

Open [session-recap.html](session-recap.html) for the deterministic rehearsal. Recreate the reviewed session by building Storage and going home without a milestone. Then reset, reach room five, pin Seed Sail and build Storage. Finally plant the bridge flower after the build to confirm that the newest visible change becomes the headline while the dungeon depth and next invitation remain.

## Event priority, not category priority

Buildings and settled expedition outcomes enter one ordered `recapEvents` list when the host accepts them. The latest event wins even if it belongs to a lower tier. A flower planted after Storage should not be hidden by a permanent “buildings first” rule. Dungeon depth is continuous progress rather than a visible village change, so it remains its own maximum.

Use stable event IDs and compact payloads, not presentation strings:

| Event | Payload kept for this session | Example rendering |
|---|---|---|
| Building completed | build kind, resulting level or effect numbers | Built Storage · carry 4 now |
| Landmark settled | activity ID and validated named outcome | Flower planted by the bridge |
| Return project completed | project ID and validated result ID | Lantern path reaches the picnic |
| Cottage upgraded | resulting cottage level and carry speed/capacity numbers | Cottage level 2 · carry 4 now |

The event list is a session recap source, not a second village save. The underlying building and discovery records remain authoritative.

## Claude handoff

- Add session-only `deepestDungeon?: { dungeon: number; room: number; max: number }` and ordered recap event IDs to host state, snapshot and `View`. Update depth whenever `s.dg.floor` increases, before `leaveDungeon` sets `s.dg = null`. Do not infer it later from the unlocked dungeon number.
- Keep `builtNow` compatible, but emit a recap event from the same accepted build transition. Include cottage upgrades, which currently do not enter `builtNow`. Settled discovery/project events should be emitted only after their save state validates.
- Include optional fields in snapshots so late joiners see the same final recap. Missing fields from old snapshots default to no event and no dungeon depth. Never clear buildings, bank or dungeon unlocks during migration.
- The host chooses the pinned project. Store the project in the proposed village record; snapshots carry its validated ID. The end screen reads it but cannot change it.
- On `LONG_GAME` voluntary exits, replace the fixed three-image star row with exactly the earned gold stars and hide it when `goal === 0`. Preserve the legacy automatic-result branch behind its existing flag until that mode is removed.
- Save the village before promising permanence. If storage is unavailable, keep the recap honest: “Built for this visit” or “Flower lasts for this visit.” Do not show a generic success title that implies persistence.
- Render the same ordered recap on every phone. Only the host keeps replay/navigation controls; guests still see the accomplishment and next invitation before “Waiting for host.”

## Acceptance

Cover zero, one and three milestones; no activity; building only; cottage upgrade only; dungeon only; building plus dungeon; multiple ordered world changes; pinned project; no pinned project; a completed dungeon; early dungeon exit; late join before ending; disconnect during ending; duplicate snapshots; old snapshots without recap fields and unavailable storage. Verify that ending after six of ten wood with Storage built says **Built Storage** and shows no empty star.

At 390 × 844 portrait and 844 × 390 short landscape, keep headline, one supporting fact, next invitation and host/guest state visible without scrolling. The cheering blobz may shrink before any of those four parts. Read the screen separately to child and adult, then ask “What will still be there?” and “What would you do first next time?”

## Sprite handoff

The [native strip](art/session-recap.png) contains four 24 × 24 authored frames of one unfurling keepsake. The building, dungeon memory and next-outing marker appear in sequence. Key out exactly RGB(255, 0, 255) and use nearest-neighbour scaling. Do not animate the real recap until its text has already appeared; the still final state must carry the invitation.

## Checkpoint · 19 November 2026

The voluntary exit now has an evidence-based content hierarchy, a playable event-order rehearsal, snapshot/save guidance and regression cases. Live integration, actual translation, real storage feedback and child/adult phone comprehension remain open.
