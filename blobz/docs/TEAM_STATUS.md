# Blobz status (Assistant updates at every merge)
Deploy: v057b @ d1f47f1 (2026-11-21; docs-only commits since the last code merge f1be3f3, VERSION unchanged)
Branch heads: art 9e4df43 (c84c406 merged; HyperAgent inbox + approval record not yet merged, docs only) / code 10b2116 (merged) / dungeon 3e538ea (merged) / hyperagent/blobz-room-handoff 6b57540 (NOT merged, see below)
HyperAgent: origin/hyperagent/blobz-room-handoff @ 6b57540 = handoff README (docs/art-review/hyperagent/2026-11-21-room-handoff/README.md, commit by the owner account Luborg Development). Agents: GLOOP = pixel art + visual review, PATCH = implementation review/playtest. Delivery and relay go through Art, Art reads the branch. Never merged to deploy, never modified by the Assistant. Our channel to them: blobz/docs/HYPERAGENT_INBOX.md on claude/blobz-art (Art creates it, not there yet).
Other branch: origin/gpt/blobz-family-play-and-art, unclear origin (owner account Luborg Development, 40 commits ahead of f1be3f3, 74 files, all under blobz/docs/). NOT to be merged without Lead's OK.
Open handoffs:
- Lead -> Code: wire the merged art N-37..N-40 (start-240.png, party-platform-140.png, logo-150/64.png, cottage-1/-32.png, res-berry-32.png) into the game, in progress (assets on deploy since 5c653de, not referenced by the game yet). Then Code does N-31 / N-15 (meadow), Code 2 does N-14 (boss banner)
- Art -> HyperAgent: N-43 hats per docs/HYPERAGENT_BRIEF.md (published since e75551d, contact line since 66c98c4), no N-43 sheet delivered yet
- Art: create docs/HYPERAGENT_INBOX.md (channel to the HyperAgent agents)
Resolved: N-37..N-40 ARE approved (Stefan confirmed 2026-11-21; board answers 2026-11-16 + his chat message). HyperAgent could not see the board.
Waiting for Stefan:
- type "next" in ChatGPT for N-42 (ranger bow icon) and N-44 (dungeon room props)
- Drive mirror workflow: Stefan set BLOBZ_DRIVE_FOLDER_ID on 2026-11-21, result of the first run after it is reported by the Assistant
