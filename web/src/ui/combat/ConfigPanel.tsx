// Fight setup: hero tier, monster species, number of stacks and stack size,
// plus a live readout of the chosen hero's derived stats (so the math is
// legible). Locked while a fight is running.

import { memo } from "react";
import {
  ARMORS,
  HERO_TEMPLATES,
  HERO_TIERS,
  MONSTER_SPECIES,
  MONSTER_TEMPLATES,
  WEAPONS,
  attackInterval,
  baseDamage,
  dodgeChance,
  maxHp,
  maxStacks,
  type HeroTier,
  type MonsterSpecies,
} from "../../game/battle";
import styles from "./ConfigPanel.module.css";

export interface ConfigPanelProps {
  heroTier: HeroTier;
  monster: MonsterSpecies;
  stackCount: number;
  stackSize: number;
  disabled: boolean;
  onHeroTier: (t: HeroTier) => void;
  onMonster: (m: MonsterSpecies) => void;
  onStackCount: (n: number) => void;
  onStackSize: (n: number) => void;
}

function Segmented<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.segment} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={`${styles.seg} ${value === o.value ? styles.segOn : ""}`}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className={styles.stepper}>
      <button
        className={styles.stepBtn}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="decrease"
      >
        −
      </button>
      <span className={styles.stepVal}>{value}</span>
      <button
        className={styles.stepBtn}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}

function ConfigPanelImpl(props: ConfigPanelProps) {
  const { heroTier, monster, stackCount, stackSize, disabled } = props;
  const hero = HERO_TEMPLATES[heroTier];
  const a = hero.attributes;
  const weapon = WEAPONS[hero.weapon];
  const armor = ARMORS[hero.armor];

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <span className={styles.label}>Hero</span>
        <Segmented
          value={heroTier}
          disabled={disabled}
          onChange={props.onHeroTier}
          options={HERO_TIERS.map((t) => ({ value: t, label: HERO_TEMPLATES[t].name }))}
        />
        <dl className={styles.stats}>
          <div><dt>HP</dt><dd>{maxHp(a)}</dd></div>
          <div><dt>DMG</dt><dd>{baseDamage(a)}</dd></div>
          <div><dt>Dodge</dt><dd>{Math.round(dodgeChance(a) * 100)}%</dd></div>
          <div><dt>Swing</dt><dd>{attackInterval(weapon.baseSeconds, a).toFixed(2)}s</dd></div>
        </dl>
        <span className={styles.gear}>
          {weapon.name} · {armor.name}
        </span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Enemy</span>
        <Segmented
          value={monster}
          disabled={disabled}
          onChange={props.onMonster}
          options={MONSTER_SPECIES.map((m) => ({ value: m, label: MONSTER_TEMPLATES[m].name }))}
        />
      </div>

      <div className={styles.steppers}>
        <label className={styles.stepField}>
          <span className={styles.label}>Stacks</span>
          <Stepper value={stackCount} min={1} max={maxStacks()} disabled={disabled} onChange={props.onStackCount} />
        </label>
        <label className={styles.stepField}>
          <span className={styles.label}>Each ×</span>
          <Stepper value={stackSize} min={1} max={3} disabled={disabled} onChange={props.onStackSize} />
        </label>
      </div>
    </div>
  );
}

export const ConfigPanel = memo(ConfigPanelImpl);
