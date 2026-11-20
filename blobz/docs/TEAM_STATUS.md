# Blobz status (Assistant updates at every merge)
Deploy: v057b @ 66c98c4 (2026-11-21; docs-only commits on top of it, VERSION unchanged)
Branch heads: art c84c406 (merged) / code 10b2116 (merged) / dungeon 3e538ea (merged) / hyperagent/* none yet
Other branch: origin/gpt/blobz-family-play-and-art, unclear origin (owner account Luborg Development, 40 commits ahead of f1be3f3, 74 files, all under blobz/docs/). NOT to be merged without Lead's OK.
Open handoffs:
- Lead -> Code: wire the merged art N-37..N-40 (start-240.png, party-platform-140.png, logo-150/64.png, cottage-1/-32.png, res-berry-32.png) into the game, in progress (assets on deploy since 5c653de)
- Art -> HyperAgent: N-43 hats per docs/HYPERAGENT_BRIEF.md (published since e75551d, contact line added in 66c98c4), waiting for hyperagent/* deliveries
Waiting for Stefan:
- type "next" in ChatGPT for N-42 (ranger bow icon) and N-44 (dungeon room props)
- Drive mirror workflow fails on every push: add the Actions variable BLOBZ_DRIVE_FOLDER_ID (Settings > Secrets and variables > Actions > Variables; the secret BLOBZ_DRIVE_TOKEN is already set)
