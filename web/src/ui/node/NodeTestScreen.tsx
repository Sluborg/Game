// Node Test — the minimal vertical slice that proves the ArtLibrary bridge:
//   * the overworld map (a real visual) loads THROUGH ArtCatalog by raw_url and
//     renders as the backdrop, and
//   * a few building nodes (no art produced yet) degrade to placeholders without
//     crashing.
// No mechanics, no idle systems — a clean foundation to grow from.

import { useEffect, useState } from "react";
import { loadArtCatalog, NodeType, type ArtCatalog } from "../../art";
import styles from "./NodeTestScreen.module.css";

interface Props {
  onExit: () => void;
}

// A few nodes scattered over the map, positioned as % of the backdrop.
const NODES: { type: NodeType; left: string; top: string }[] = [
  { type: NodeType.HomeKeep, left: "28%", top: "58%" },
  { type: NodeType.LumberCamp, left: "54%", top: "40%" },
  { type: NodeType.Market, left: "72%", top: "66%" },
];

const NODE_SIZE = 76;

export function NodeTestScreen({ onExit }: Props) {
  const [catalog, setCatalog] = useState<ArtCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadArtCatalog()
      .then((c) => alive && setCatalog(c))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);

  const backdrop = catalog?.bySlug("map-overworld-v2");

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <button className={styles.back} onClick={onExit}>
          ← Menu
        </button>
        <span className={styles.heading}>Node Test</span>
        <span className={styles.spacer} />
      </header>

      <div
        className={styles.map}
        style={backdrop ? { backgroundImage: `url("${backdrop.rawUrl}")` } : undefined}
      >
        {!catalog && !error && <div className={styles.note}>Loading art…</div>}
        {error && <div className={styles.note}>Art unavailable — {error}</div>}

        {catalog &&
          NODES.map(({ type, left, top }) => {
            const visual = catalog.byNode(type, { width: NODE_SIZE, height: NODE_SIZE });
            return (
              <figure key={type} className={styles.node} style={{ left, top }}>
                <img src={visual.rawUrl} alt={type} width={NODE_SIZE} height={NODE_SIZE} />
                <figcaption className={styles.caption}>
                  {type}
                  {visual.isPlaceholder ? " · placeholder" : ""}
                </figcaption>
              </figure>
            );
          })}
      </div>
    </div>
  );
}
