# Cottage discovery display · Remember what changed

The cottage display is the bridge between an outing and the next family decision. It holds three physical trophies: an opened reed seedpod, a fired clay spiral and a glow jar. Each appears only after its landmark outcome. Locked spaces remain visible as silhouettes, so the shelf promises a collection without naming an unknown material.

Open [cottage-display.html](cottage-display.html) for the phone-first study. Complete the three discoveries in order, reload the page, then choose a return project. The study reuses the accepted [discovery token strip](art/discovery-tokens.png).

## What the family sees

1. Returning from an outing pulses only the newest trophy.
2. The recap names the world change first, such as “Flower planted by the bridge.” A small picture underneath points toward the next clue.
3. Touching any collected trophy recalls its action and landmark. It does not open a resource inventory.
4. After the picnic clearing, three project silhouettes appear beside the shelf. Choosing one pins its two ingredient trophies and its destination.
5. The unchosen projects remain available next session. Completing one adds its result beside the shelf.

The display is shared village state. Guests see and use the host’s discoveries. Their own village remains unchanged. The shelf should never show spendable counts for these capability resources.

## First project choice

| Project | Pinned pictures | Destination clue |
|---|---|---|
| Seed sail | Reed + Glow | Wind vane above the reed pool |
| Lantern stepping stones | Clay + Glow | Two empty cup sockets on the picnic trail |
| Beetle berry run | Reed + Clay | Beetle tracks beside the garden |

Do not rank these choices or attach efficiency numbers. Ask “What should we make next?” The family is choosing an outing and a lasting world change.

## Claude handoff

- Add optional, independently validated discovery and selected-project fields to the village save. Preserve cottage, buildings, bank and dungeon for every old or partially malformed v2 record.
- Record settled outcomes, named trophy IDs and project ID. Never store world coordinates, active carriers or an in-flight activity.
- Mark each discovery and project selection dirty immediately. The existing save throttle and swallowed storage exceptions need visible pending, saved and unavailable feedback before the recap promises persistence.
- Rebuild the shelf from host village state. Include discovery and project state in the start payload or first snapshot so a guest sees the same display. A guest cannot overwrite the host’s personal village after leaving.
- Keep the display reachable from the normal cottage interaction without covering build cards. On a short landscape screen, show the newest recap and pinned project before the full shelf.

## Acceptance

Test a fresh village, each partial discovery prefix, all three project choices, reload after each choice, unavailable storage, a guest joining after all discoveries, and an old v2 village with buildings and banked resources. At 360 and 390 CSS pixels, every visible control must be at least 44 pixels and the page must not scroll horizontally.

Ask the child and adult separately what each trophy means and where they would go next. The display succeeds when they answer with an action or place. An answer such as “we have one purple thing” means the trophy needs a clearer action reminder.

## Checkpoint · 19 November 2026

The study covers discovery recap, persistent shelf state and project selection. Integration with the live cottage build panel, peer-host village ownership and real storage feedback remain open.
