# Blobz live designer QA — 2026-11-21

**Agent / platform:** Patch / Hyperagent. **Assignment:** Claude Art for Lead, `claude/blobz-art@9e4df43`, `blobz/docs/HYPERAGENT_INBOX.md`: check all six shapes × ten visible hat choices × six eye styles in the live portrait designer. No art was generated. This is a QA handoff, not a request to merge anything.

**Test target:** [Live Blobz](https://sluborg.github.io/Game/), v057b, build tooltip `1d3f6f6`, JS bundle `index-ppG00_xb.js`. Headless Chromium 153.0.8010.0 via Playwright on Linux; 390×844 CSS px, DPR 3, mobile/touch emulation, Swedish UI. The test drove the visible designer's tabs, pagination and option handlers, and sampled pixels from each rendered preview. It checked all 360 unique selections with **Leende** mouth and the first blue colour (**#5EC8FF**) fixed. The 10 choices include **Ingen**. Zero page errors observed. Actual phones, mobile Safari, shared Wi‑Fi, host/joiner, movement and cross-reload profile persistence were not tested in this pass.

## Findings

1. **Cap bill extends past the upper head on 5 of 6 shapes.** Repro: choose **Kub → Keps → Prick → Leende → #5EC8FF**. The right bill is 3 art pixels past the head silhouette and its outline touches the last column of the 20×20 sprite; the browser screenshot shows no visible truncation, but there is no margin. **Päron** also extends 3 px; **Kupol, Boll and Lång** extend 2 px. **Platt** did not exceed 1 px with this measurement. All six eyes reproduce each flagged shape (30/360). The comparison includes the outline and uses the no-hat silhouette over the upper four occupied rows as the head edge; this is a review flag against the requested >1 px tolerance, not a claim that the bill shape is accidental. See [Kub screenshot](live-3.svg) and the marked rows in both matrices.
2. **The body shine moves onto the hat in 25 shape/hat pairs (150/360).** Repro: choose **Kupol → Ingen → Prick → Leende → #5EC8FF**, then select **Keps** without changing anything else. The three white body pixels disappear together; the hat takes the highlight. [Live Keps screenshot](live-0.svg). This is consistent with the renderer's deliberate fallback that prevents a leftover body dot. If the three body pixels must remain visible, review the marked rows: **Keps, Mössa, Trollkarl and Drottningkrona** on every shape except Platt; **Rosett** on Kupol, Boll, Lång and Päron; **Krona** on Kub. Each pair reproduces with every eye style. I wouldn't change the fallback as a bug fix without Lead confirming the desired art rule.

No leftover single pure-white body-shine pixel, no eye pixels overwritten relative to the same hatless look, and no unintended floating components were found. Halo is a deliberate design. No visible clipping was found in the screenshots; the Kub/Keps edge contact above is the one potential clipping risk. Conclusions are limited to the single mouth/colour above and this browser/build.

## Evidence

- [Matrix 1–3: Kupol, Boll, Lång](matrix-1-3.svg) · [Matrix 4–6: Platt, Päron, Kub](matrix-4-6.svg). These are contact sheets made from the live previews (nearest-neighbour at 3×), not full browser screenshots. Eye order: 1 Prick, 2 Stora, 3 Glada, 4 Sömniga, 5 Blink, 6 Prickögon hög.
- [Kupol/Keps](live-0.svg) and [Kub/Keps](live-3.svg) are actual Chromium screenshots. Evidence SVGs contain the original PNG bytes, not redrawn art. Both use Prick, Leende and #5EC8FF.
- `flags.json` lists the flagged combinations. No application source, asset, or public game modifications.
