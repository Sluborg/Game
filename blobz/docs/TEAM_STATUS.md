# Blobz status (Assistant updates at every merge)
Deploy: v057b @ e75551d (2026-11-20; the docs commit that adds this file sits on top, VERSION unchanged)
Branch heads: art c84c406 / code 10b2116 / dungeon 3e538ea / hyperagent/* none yet (origin/gpt/blobz-family-play-and-art exists, not merged)
Open handoffs:
- Lead -> Code: wire the merged art N-37..N-40 (start-240.png, party-platform-140.png, logo-150/64.png, cottage-1/-32.png, res-berry-32.png) into the game, in progress since 2026-11-20 (assets on deploy since 5c653de)
- Art -> Assistant: art branch is ahead of deploy (c84c406 vs merged a34e35c); not merged, waiting for Lead's order
- Art -> HyperAgent: N-43 hats per docs/HYPERAGENT_BRIEF.md, published on deploy since e75551d (raw URL verified), waiting for hyperagent/* deliveries
Waiting for Stefan:
- type "next" in ChatGPT for N-42 (ranger bow icon) and N-44 (dungeon room props)
- Drive mirror workflow fails on every push: add the Actions variable BLOBZ_DRIVE_FOLDER_ID (Settings > Secrets and variables > Actions > Variables; the secret BLOBZ_DRIVE_TOKEN is already set)
