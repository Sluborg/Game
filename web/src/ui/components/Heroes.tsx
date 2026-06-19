// Hero roster. Port of HeroPortrait.kt — class emoji, name, level, HP & XP bars,
// and the current AI state label.

import { MAX_HERO_LEVEL } from "../../game/constants";
import { HERO_CLASS_DEFS, experienceToNextLevel, heroHpPercent } from "../../game/heroes";
import type { Hero, GameState } from "../../game/types";
import { colors } from "../theme";

const STATE_LABEL: Record<Hero["state"], string> = {
  IDLE: "Idle",
  PATROLLING: "Patrol",
  HUNTING: "Hunt!",
  FLEEING: "Flee!",
  SHOPPING: "Shop",
  RESTING: "Rest",
};

function HeroCard({ hero }: { hero: Hero }) {
  const def = HERO_CLASS_DEFS[hero.heroClass];
  const hpPct = heroHpPercent(hero);
  const maxed = hero.level >= MAX_HERO_LEVEL;
  const xpPct = maxed ? 1 : hero.experience / experienceToNextLevel(hero);
  const hpColor = hpPct > 0.5 ? colors.forestGreen : colors.bloodRed;
  return (
    <div className="hero-card">
      <div className="hero-emoji">{def.icon}</div>
      <div className="hero-name">{hero.name}</div>
      <div className="hero-level">Lv {hero.level}</div>
      <div className="bar bar-hero">
        <div className="bar-fill" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
      </div>
      <div className="hero-hp-text">
        {hero.hp}/{hero.maxHp}
      </div>
      {maxed ? (
        <div className="hero-max">MAX</div>
      ) : (
        <div className="bar bar-xp">
          <div className="bar-fill" style={{ width: `${xpPct * 100}%`, background: colors.goldDark }} />
        </div>
      )}
      <div className="hero-state">{STATE_LABEL[hero.state]}</div>
    </div>
  );
}

export function Heroes({ state }: { state: GameState }) {
  return (
    <div className="section">
      <div className="section-title">🛡️ Heroes</div>
      <div className="hero-row">
        {state.heroes.map((h) => (
          <HeroCard key={h.id} hero={h} />
        ))}
      </div>
    </div>
  );
}
