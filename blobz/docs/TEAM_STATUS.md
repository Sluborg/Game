# Blobz status (Assistant updates at every merge)
Deploy: v058d @ code merge 64fe229 + art assets push (art b6b0656: N-42 bow icons, N-44 dungeon props, N-43 hat previews; assets and docs only, VERSION unchanged)
Branch heads: art b6b0656 (merged, assets+docs only) / code 0e8b030 (merged, v058d; e76e7c1 = v058b, fd6e5cf = v058) / dungeon 261c353 (merged, v058c) / hyperagent/blobz-room-handoff 6b57540 (NOT merged, see below)
HyperAgent: origin/hyperagent/blobz-room-handoff @ 6b57540 = handoff README (docs/art-review/hyperagent/2026-11-21-room-handoff/README.md, commit by the owner account Luborg Development). Agents: GLOOP = pixel art + visual review, PATCH = implementation review/playtest. Delivery and relay go through Art, Art reads the branch. Never merged to deploy, never modified by the Assistant. Our channel to them: blobz/docs/HYPERAGENT_INBOX.md on claude/blobz-art (on deploy since 4244d50).
Other branch: origin/gpt/blobz-family-play-and-art, unclear origin (owner account Luborg Development, 40 commits ahead of f1be3f3, 74 files, all under blobz/docs/). NOT to be merged without Lead's OK.
Open handoffs:
- Code: N-37..N-40 (v058), N-31 / N-15 (v058b), Code 2: N-14 boss banner (v058c) all live. Next: Code 2 wires N-42 bow icon + N-44 props (assets on deploy), HyperAgent N-43 hats at one width in review.
- Art -> HyperAgent: N-43 hats per docs/HYPERAGENT_BRIEF.md (published since e75551d, contact line since 66c98c4), no N-43 sheet delivered yet
Resolved: N-37..N-40 ARE approved (Stefan confirmed 2026-11-21; board answers 2026-11-16 + his chat message). HyperAgent could not see the board.
Waiting for Stefan:
- type "next" in ChatGPT for N-42 (ranger bow icon) and N-44 (dungeon room props)
- Drive mirror workflow: Stefan set BLOBZ_DRIVE_FOLDER_ID on 2026-11-21, result of the first run after it is reported by the Assistant
