// Map — the minimal vertical slice that proves the ArtLibrary bridge and the
// game's first interactive overworld:
//   * the overworld map (a real visual) loads THROUGH ArtCatalog by slug and
//     renders as the backdrop, and
//   * the first three real map nodes — Guild Hall, Village, Ruins — render (as
//     labelled placeholders until their art lands) and are click-to-select.
// No mechanics, no idle systems — a clean foundation to grow from.

import { useEffect, useState } from "react";
import { buildCatalog, loadArtCatalog, NodeType, type ArtCatalog } from "../../art";
import styles from "./NodeTestScreen.module.css";

interface Props {
  onExit: () => void;
}

// The first three real map nodes, positioned as % of the backdrop. `label` is the
// player-facing name, deliberately distinct from the internal slug (NodeType value)
// — the seam where "what the player knows" will later diverge from ground truth.
interface MapNode {
  type: NodeType;
  label: string;
  left: string;
  top: string;
}

const NODES: MapNode[] = [
  { type: NodeType.HomeKeep, label: "Guild Hall", left: "28%", top: "58%" },
  { type: NodeType.Settlement, label: "Village", left: "54%", top: "40%" },
  { type: NodeType.Ruins, label: "Ruins", left: "72%", top: "66%" },
];

const NODE_SIZE = 76;

// Render nodes even before (or if) the manifest loads: an empty catalog resolves
// every slug to a labelled placeholder, so the map is never blank on a fresh clone
// or an offline/blocked fetch.
const EMPTY_CATALOG = buildCatalog({ assets: [] });

export function NodeTestScreen({ onExit }: Props) {
  const [catalog, setCatalog] = useState<ArtCatalog>(EMPTY_CATALOG);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<NodeType | null>(null);

  useEffect(() => {
    let alive = true;
    loadArtCatalog()
      .then((c) => {
        if (!alive) return;
        setCatalog(c);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setStatus("error");
        console.warn("Map: art catalog failed to load; using placeholders.", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Only paint the backdrop once the REAL map visual is available — a placeholder
  // backdrop would just be a dashed box, so we leave the surface colour instead.
  const backdrop = catalog.bySlug("map-overworld-v2");
  const backdropUrl = backdrop.isPlaceholder ? undefined : backdrop.rawUrl;

  const selectedNode = NODES.find((n) => n.type === selected) ?? null;

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <button className={styles.back} onClick={onExit}>
          ← Menu
        </button>
        <span className={styles.heading}>Map</span>
        <span className={styles.spacer} />
        <span className={styles.selection} aria-live="polite">
          {selectedNode ? `Selected: ${selectedNode.label}` : "No node selected"}
        </span>
      </header>

      <div
        className={styles.map}
        style={backdropUrl ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
      >
        {/* Nodes render regardless of load state, so no "loading" banner over live
            nodes; only surface a note when art genuinely failed to load. */}
        {status === "error" && (
          <div className={styles.note}>Showing placeholders — live art unavailable</div>
        )}

        {NODES.map((node) => {
          const visual = catalog.byNode(node.type, {
            width: NODE_SIZE,
            height: NODE_SIZE,
            label: node.label,
          });
          const isSelected = selected === node.type;
          return (
            <button
              key={node.type}
              type="button"
              className={`${styles.node} ${isSelected ? styles.selected : ""}`}
              style={{ left: node.left, top: node.top }}
              aria-pressed={isSelected}
              aria-label={`${node.label}${visual.isPlaceholder ? " (placeholder art)" : ""}`}
              onClick={() => setSelected(node.type)}
            >
              <img src={visual.rawUrl} alt="" width={NODE_SIZE} height={NODE_SIZE} />
              <span className={styles.caption}>{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
