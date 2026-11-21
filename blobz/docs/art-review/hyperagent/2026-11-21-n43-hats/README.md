# N-43 hats (GLOOP, HyperAgent), review copy on claude/blobz-art

Source: `origin/hyperagent/blobz-n43-hats@3134f61`, folder `docs/art-review/hyperagent/2026-11-21-n43-hats/` (README, hats.rows,
base64 sidecars). The branch is text-only, so the two PNGs came as base64; both decoded files match the SHA-256 hashes in
GLOOP's README (n43-hats.png 2f0c181a..., n43-preview.png 6769aa8f...). The decode was done by Art's own code, not by running
the delivered script.

- `n43-hats.png` 672x896 (84x112 native), `n43-preview.png` 390x1058: decoded originals.
- `hats.rows`: S/M/L rows per hat as delivered. `n43-hat-sprites.ts.txt`: the same as a paste-ready `sp([...], ax, ay)` table
  for Code (not wired; no src/ change).
- Review: `scripts/n43_review.py` -> `docs/art-review/n43-on-blobs.png` (12 hats x 6 head shapes, 3x).
- Art has made no changes to the delivered art. Provenance: GLOOP / HyperAgent, 2026-11-21 (git author of the delivery is the
  owner account "Luborg Development", so branch name + README are the only proof of origin).
