# Dungeon skill cards for a family sharing a phone-sized battlefield

Design handoff, 18 November 2026. Checked against the class, input and card definitions in [dungeon.ts](../../../src/dungeon.ts), the [player-facing labels](../../../src/i18n.ts) and [controls](../../../src/controls.ts). The table describes current effects on the reviewed branch. Suggested names, drawings and encounters are proposals. Recognition and fun need a family playtest.

## Fix three misleading promises first

1. **Marksman.** The existing More arrows upgrade selects two extra Volley targets. An image of five arrows hitting one boss would promise a boss damage upgrade. Rename it **Two more targets**. Put one bolt in each of three distinct slime silhouettes. Reserve a fan of projectiles for an actual spread shot. This supersedes the Fan Shot art recommendation for the current card in DIRECTIONS.md.
2. **Tank.** Stronger shield raises damage globally. Rename it **Heavier hits** and draw the sword landing hard. Keep a shield icon for an effect that changes what guard does. The player should be able to guess which button to try after choosing a card.
3. **Healer.** Faster revive shortens the team's automatic recovery while the Healer is standing. The aimed heal bolt already revives instantly. Call the card **Friends get up sooner**. Draw a fallen ally getting back up beside a clock. Save the heart-in-bubble icon for a bolt that actually shields someone.

## Make each family's first upgrade a decision they can try in the next room

| Class | Existing choice to put side by side | Tiny encounter | What a teammate might say |
|---|---|---|---|
| Marksman | Pierce vs extra volley targets | Two enemies overlap in a lane, then three spread apart. A partner can draw enemies into line while the shooter repositions. | “Bring those two this way!” |
| Healer | Shield bubble vs stronger attack bolt | A slow projectile approaches a friend. Allow time to switch wand mode and land one heal. Give attack mode a useful target immediately afterwards. | “I saw the bubble pop. Do it again.” |
| Rogue | Bigger whirl vs harder push | Put a pair near the Tank and a third enemy just outside normal whirl reach. Let the Rogue choose between catching all three and making space around their friend. | “I’ll get them off you.” |
| Tank | Safe charge vs longer stun | A visible ranged enemy starts winding up behind the front line. Charge through the approach or help hold the front enemy still for an ally. | “I'll take the one at the back.” |

Try these with existing effects first. Use a predictable enemy placement for the test. Each player should be able to describe one thing they did differently because of their choice. Give the Healer a solo alternative while testing ally-targeted choices. Drawing a bubble never solves a card that has no available recipient.

## Icon brief for the current 24 cards

Read each row as current effect → proposed drawing. Keep the weapon recognisable in the first frame. Use a different silhouette for time, distance, targets and impact. Reserve a heart for health. An arrow used as a motion mark should have a visibly different outline from a crossbow bolt.

| Class | Current effect | Drawing to test |
|---|---|---|
| Rogue | Shorter basic attack interval | Dagger with a tight pair of slash marks |
| Rogue | Greater knockback | Enemy pushed away from a planted blade, gap visible |
| Rogue | Larger whirl radius | Blob at centre of a wide circular slash |
| Rogue | Higher maximum HP | Heart in an expanded outline, same health symbol as Tank |
| Rogue | Heal on kill | Enemy splat releasing one small heart toward the Rogue |
| Rogue | Higher damage | Dagger buried in a chunky impact star |
| Healer | Higher healing per bolt | Wand bolt entering a large heart |
| Healer | Periodic self-heal | Heart looping back into the caster |
| Healer | Heal bolt gives a one-hit shield | Ally enclosed in a bubble with a single bright rim |
| Healer | Shorter automatic ally recovery | Fallen ally rising beside a clock |
| Healer | Higher attack bolt damage | Wand bolt breaking on a target |
| Healer | Shorter bolt interval | Wand with two close-spaced pulses |
| Marksman | Two extra volley targets | Bolts striking distinct targets |
| Marksman | Basic bolt pierces another target | One straight bolt passing through two silhouettes |
| Marksman | Higher critical-hit chance | Single bolt in a bullseye with a small impact star |
| Marksman | Shorter firing interval | Crossbow releasing two successive bolts |
| Marksman | Basic bolt stuns | One bolt pinning one snowflake |
| Marksman | Volley stuns | Several separate targets each bearing a snowflake |
| Tank | Charge grants brief invulnerability | Shield leading a dash through a small incoming bolt |
| Tank | Higher enemy targeting preference | Two enemy eyes turned toward one shield |
| Tank | Higher maximum HP | Shared expanded-heart symbol |
| Tank | Higher damage | Sword striking a chunky impact star |
| Tank | Longer stun | Stunned enemy with a clock |
| Tank | Shorter sword interval | Sword with two close-spaced slash marks |

## Small art batch and test

Draw only the three misleading cards first, plus Pierce as a visual foil for the volley. Use the existing 24 × 24 cell convention, exact #FF00FF outside the art, and a two- or four-frame authored loop. The resting frame must carry the meaning whenever the phone shows a still card. Use movement to clarify it: Pierce travels through a second target along one line. Volley strikes separate targets. Heavier hits pauses on impact. Recovery moves the ally from down to standing.

Present each pair at real card size with the label covered. Ask “Which would you pick here?” Show the room and let the player point. Then reveal the label, play the encounter and ask “What happened when you used it?” Record the mistaken prediction verbatim. If both players predict five hits against one boss, redraw the Volley icon before expanding the set.

Acceptance for Claude: verify every final label in Swedish and English against the active input or stat modifier. Check the card adjacent to its closest lookalike on a phone. Account for players who see only frame one. Leave the other twenty images until these four can be distinguished in play.
