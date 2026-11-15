# Dungeon skills (24) + items (5): current text and icon

Generated from the code (`SKILLS`, `ITEMS`, `skillIcon()`, `ITEM_ICON` in `src/dungeon.ts`; texts from `src/i18n.ts`
via `tSkill` / `tItem` / `tEffects`), 2026-11-15. Icon paths are under `public/assets/ninja-adventure/`.
For ChatGPT: skills = level-up cards (one class each); items = rare loot (any class, one slot).

## Skills (level-up cards)

| Class | Id | Name SV / EN | Effect text SV / EN | Mod | Icon now |
|---|---|---|---|---|---|
| Rogue | rogue-rage | Snabbare hugg / Faster hits | 20% snabbare / 20% faster | rate 0.8 | Ui/Skill Icon/Spell/OrbFire.png |
| Rogue | rogue-knockback | Hårdare knuff / Harder push | +50% knuff / +50% push | kb 1.5 | Ui/Skill Icon/Spell/Explosion.png |
| Rogue | rogue-whirlwind | Större virvel / Bigger whirl | Special +30% större / Special +30% bigger | spR 1.3 | Ui/Skill Icon/Items & Weapon/Shuriken.png |
| Rogue | rogue-extraheart | Mer hälsa / More health | +25 hälsa / +25 health | hp 25 | Ui/Skill Icon/Spell/Heal.png |
| Rogue | rogue-lifesteal | Läk när du splattar / Heal on splat | +5 hälsa per splat / +5 health per splat | killHeal 5 | Ui/Skill Icon/Job & Action/Potion.png |
| Rogue | rogue-power | Starkare / Stronger | +25% skada / +25% damage | dmg 1.25 | Ui/Skill Icon/Spell/AttackUpgrade.png |
| Healer | healer-heal | Läka mer / Heal more | +50% läkning / +50% healing | heal 1.5 | Ui/Skill Icon/Spell/Heal.png |
| Healer | healer-regen | Läk dig själv / Heal yourself | +4 hälsa var 4:e s / +4 health every 4 s | regen 4 | Ui/Skill Icon/Spell/OrbPlant.png |
| Healer | healer-bubble | Skyddsbubbla / Shield bubble | Skydd mot 1 träff / Blocks 1 hit | shieldAll 1 | Ui/Skill Icon/Spell/DefenseUpgrade.png |
| Healer | healer-revive | Väck snabbare / Faster revive | Vänner vaknar 2 s fortare / Friends wake 2 s sooner | koFast 2 | Ui/Skill Icon/Spell/OrbLight.png |
| Healer | healer-holy | Starkare stav / Stronger staff | +40% skada / +40% damage | dmg 1.4 | Ui/Skill Icon/Spell/BookLight.png |
| Healer | healer-cleanse | Snabbare stav / Faster wand | 20% snabbare / 20% faster | rate 0.8 | Ui/Skill Icon/Spell/OrbWater.png |
| Marksman | marksman-multishot | Fler pilar / More arrows | +2 pilar i regnet / +2 arrows in the volley | arrows 2 | Ui/Skill Icon/Items & Weapon/Kunai.png |
| Marksman | marksman-pierce | Pil genom monster / Arrow through monster | Pilen går genom 1 monster / Arrow goes through 1 monster | pierce 1 | Ui/Skill Icon/Items & Weapon/Arrow.png |
| Marksman | marksman-crit | Fullträff / Bullseye | 25% chans dubbel skada / 25% chance double damage | crit 0.25 | Ui/Skill Icon/Spell/Vision.png |
| Marksman | marksman-speed | Snabbare pilar / Faster arrows | 20% snabbare / 20% faster | rate 0.8 | Ui/Skill Icon/Spell/Upgrade.png |
| Marksman | marksman-poison | Frys-pilar / Freeze arrows | Fryser monster +0,5 s / Freezes monster +0.5 s | stun 0.5 | Ui/Skill Icon/Spell/BookIce.png |
| Marksman | marksman-trap | Frys-regn / Freeze volley | Pilregnet fryser 1,5 s / Volley freezes 1.5 s | trap 1.5 | Ui/Skill Icon/Items & Weapon/Hook.png |
| Knight | tank-block | Längre block / Longer block | Block +0,4 s / Block +0.4 s | dodge 0.4 | Ui/Skill Icon/Spell/Counter.png |
| Knight | tank-taunt | Lockar monster / Lures monster | Lockar monster +100 / Lures monster +100 | taunt 100 | Ui/Skill Icon/Job & Action/Talk.png |
| Knight | tank-armor | Tjockare rustning / Thicker armor | +40 hälsa / +40 health | hp 40 | Ui/Skill Icon/Items & Weapon/Armor.png |
| Knight | tank-charge | Starkare sköld / Stronger shield | +30% skada / +30% damage | dmg 1.3 | Ui/Skill Icon/Spell/RockSpike.png |
| Knight | tank-stun | Bedöva / Stun | Fryser monster +0,6 s / Freezes monster +0.6 s | stun 0.6 | Ui/Skill Icon/Spell/BookThunder.png |
| Knight | tank-guard | Snabbare svärd / Faster sword | 15% snabbare / 15% faster | rate 0.85 | Ui/Skill Icon/Items & Weapon/Guard.png |

## Items (rare loot, one slot)

| Id | Name SV / EN | Effect text SV / EN | Mod | Icon now |
|---|---|---|---|---|
| ring | Rubinring / Ruby ring | +20% skada / +20% damage | dmg 1.2 | Ui/Skill Icon/Items & Weapon/Ring.png |
| helm | Järnhjälm / Iron helm | +30 hälsa / +30 health | hp 30 | Ui/Skill Icon/Items & Weapon/Helmet.png |
| gloves | Snabbhandskar / Quick gloves | 15% snabbare / 15% faster | rate 0.85 | Ui/Skill Icon/Job & Action/Punch.png |
| amulet | Stjärnamulett / Star amulet | Special 30% oftare / Special 30% more often | spCd 0.7 | Ui/Skill Icon/Items & Weapon/Amulet.png |
| stone | Läkesten / Healing stone | +5 hälsa var 4:e s / +5 health every 4 s | regen 5 | Items/Resource/GemGreen.png |

## Why they look alike / don't match (Code 2 notes)

- Skills and items both use Ninja *Skill Icon* tiles (same size, same coloured square frame), so an upgrade card and a
  loot item read the same. Suggest: skills keep a round/badge frame per class colour, items drawn as objects (no frame).
- Same icon twice: `Spell/Heal.png` for rogue-extraheart AND healer-heal.
- Mismatches: rogue-rage (faster hits) shows a fire orb; healer-cleanse (faster wand) a water orb; tank-charge
  (stronger = damage) shows rock spikes; tank-taunt shows a talk bubble; marksman-trap (freeze volley) a hook;
  marksman-poison is named "Freeze arrows" but the id says poison; tank-block (now: longer untouchable start of the
  shield charge) shows a mirror.
- Text is stale after the class plan: rogue-whirlwind and marksman-multishot/trap still refer to the specials (they
  still exist for rogue and marksman); the amulet "Special 30% more often" does nothing for the healer and knight
  (their big buttons have no cooldown now); tank-block "Block" now means the shield charge's untouchable start;
  healer-holy says "staff" while the weapon is now called "wand" (Trollstav).

## Update 2026-11-15 (Lead's go): texts + interim Ninja icons

| Id | New name SV / EN | New effect SV / EN | Icon now (interim, until ChatGPT N-23) |
|---|---|---|---|
| amulet (item) | Stjärnamulett / Star amulet | Klassrörelsen laddas 30% snabbare / Class move recharges 30% faster (mod mvCd 0.7, every class) | Items & Weapon/Amulet |
| tank-block | Skyddad rusning / Safe charge | Osårbar +0,4 s i rusningen / Untouchable +0.4 s in the charge | Spell/DefenseUpgrade |
| healer-holy | Starkare trollstav / Stronger wand | (unchanged) | Spell/BookLight |
| marksman-poison | Frostpilar / Frost arrows | (unchanged) | Spell/BookIce |
| rogue-rage | (unchanged) | (unchanged) | Items & Weapon/Boot (was OrbFire) |
| rogue-extraheart | (unchanged) | (unchanged) | Job & Action/Dish (was Heal, a duplicate) |
| healer-bubble | (unchanged) | (unchanged) | Spell/OrbWater (was DefenseUpgrade) |
| healer-cleanse | (unchanged) | (unchanged) | Spell/MagicWeapon (was OrbWater) |
| marksman-trap | (unchanged) | (unchanged) | Meteo/Snow (was Hook) |
| tank-taunt | (unchanged) | (unchanged) | Job & Action/Sing (was Talk) |
| tank-charge | (unchanged) | (unchanged) | Spell/Cut (was RockSpike) |

No icon is used twice any more.
