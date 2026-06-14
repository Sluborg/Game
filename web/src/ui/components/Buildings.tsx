// Kingdom buildings. Port of BuildingCard.kt plus a build menu for structures
// not yet built. Upgrade & recruit buttons enable/disable on gold + prereqs.

import {
  BUILDABLE_TYPES,
  BUILDING_DEFS,
  canUpgrade,
  goldPerDay,
  upgradeCost,
} from "../../game/buildings";
import { MAX_HEROES } from "../../game/constants";
import { HERO_CLASS_DEFS, recruitCost } from "../../game/heroes";
import { canRecruit } from "../../game/economy";
import type { Building, BuildingType, GameState, HeroClass } from "../../game/types";

interface Props {
  state: GameState;
  onBuild: (type: BuildingType) => void;
  onUpgrade: (id: number) => void;
  onRecruit: (cls: HeroClass) => void;
}

function LevelPips({ level, max }: { level: number; max: number }) {
  return (
    <span className="pips">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip ${i < level ? "pip-on" : ""}`} />
      ))}
    </span>
  );
}

function OwnedBuilding({ state, building, onUpgrade, onRecruit }: {
  state: GameState;
  building: Building;
  onUpgrade: (id: number) => void;
  onRecruit: (cls: HeroClass) => void;
}) {
  const def = BUILDING_DEFS[building.type];
  const gpd = goldPerDay(building);
  const upgradable = canUpgrade(building);
  const cost = upgradeCost(building);
  const partyFull = state.heroes.length >= MAX_HEROES;

  return (
    <div className="card">
      <div className="card-icon">{def.icon}</div>
      <div className="card-body">
        <div className="card-head">
          <span className="card-name">{def.displayName}</span>
          <LevelPips level={building.level} max={def.maxLevel} />
        </div>
        {gpd > 0 && <div className="card-sub gold">+{gpd} gold/day</div>}
        {def.effect && <div className="card-sub">{def.effect}</div>}

        {upgradable ? (
          <button
            className="btn btn-upgrade"
            disabled={state.gold < cost}
            onClick={() => onUpgrade(building.id)}
          >
            ⬆ Upgrade — {cost}g
          </button>
        ) : (
          <div className="card-max">★ MAX LEVEL</div>
        )}

        {def.unlocks && (
          <div className="recruit-row">
            {def.unlocks.map((cls) => {
              const rc = recruitCost(cls);
              const blockedByParty = partyFull;
              const disabled = state.gold < rc || !canRecruit(state, cls);
              return (
                <button
                  key={cls}
                  className={`btn btn-recruit ${blockedByParty ? "btn-blocked" : ""}`}
                  disabled={disabled}
                  onClick={() => onRecruit(cls)}
                >
                  {HERO_CLASS_DEFS[cls].icon} {HERO_CLASS_DEFS[cls].displayName} — {rc}g
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function Buildings({ state, onBuild, onUpgrade, onRecruit }: Props) {
  const ownedTypes = new Set(state.buildings.map((b) => b.type));
  const buildable = BUILDABLE_TYPES.filter((t) => !ownedTypes.has(t));

  return (
    <div className="section">
      <div className="section-title">🏛️ Kingdom</div>

      {state.buildings.map((b) => (
        <OwnedBuilding
          key={b.id}
          state={state}
          building={b}
          onUpgrade={onUpgrade}
          onRecruit={onRecruit}
        />
      ))}

      {buildable.length > 0 && (
        <>
          <div className="section-title section-title-sub">🏗 Build New</div>
          <div className="build-menu">
            {buildable.map((t) => {
              const def = BUILDING_DEFS[t];
              return (
                <button
                  key={t}
                  className="btn btn-build"
                  disabled={state.gold < def.baseCost}
                  onClick={() => onBuild(t)}
                >
                  {def.icon} {def.displayName} — {def.baseCost}g
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
