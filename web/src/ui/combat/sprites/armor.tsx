// Armour layers. Each receives the body's anchors and mounts its own pieces
// (chest at the chest anchor, helm at the head anchor). "none" renders nothing.
// Heavier tiers read more metallic and add a helm. Colours via tokens.

import type { JSX } from "react";
import type { BodyAnchors } from "./anchors";

const armor = "var(--sprite-armor)";
const armorShade = "var(--sprite-armor-shade)";
const metal = "var(--sprite-metal)";
const outline = "var(--sprite-outline)";

export interface ArmorProps {
  anchors: BodyAnchors;
}

function At({ p, children }: { p: { x: number; y: number }; children: JSX.Element }): JSX.Element {
  return <g transform={`translate(${p.x} ${p.y})`} stroke={outline} strokeWidth={1.4}>{children}</g>;
}

export function NoArmor(): JSX.Element {
  return <g />;
}

export function LeatherArmor({ anchors }: ArmorProps): JSX.Element {
  return (
    <At p={anchors.chest}>
      <g>
        <path d="M-19 -22 q19 -8 38 0 l-3 40 q-16 7 -32 0 Z" fill={armorShade} opacity={0.92} />
        <rect x={-4} y={-18} width={8} height={36} rx={3} fill={armor} opacity={0.7} />
      </g>
    </At>
  );
}

export function HideArmor({ anchors }: ArmorProps): JSX.Element {
  return (
    <At p={anchors.chest}>
      <g>
        <path d="M-22 -24 q22 -10 44 0 l-4 44 q-18 8 -36 0 Z" fill={armorShade} />
        <path d="M-14 -20 l6 8 l-8 6 Z" fill={armor} opacity={0.6} />
        <path d="M14 -10 l-6 8 l8 6 Z" fill={armor} opacity={0.6} />
      </g>
    </At>
  );
}

export function MailArmor({ anchors }: ArmorProps): JSX.Element {
  return (
    <g>
      <At p={anchors.chest}>
        <path d="M-20 -23 q20 -8 40 0 l-3 42 q-17 7 -34 0 Z" fill={armor} />
      </At>
      <At p={anchors.head}>
        <path d="M-15 -2 a15 16 0 0 1 30 0 l0 6 q-15 5 -30 0 Z" fill={metal} />
      </At>
    </g>
  );
}

export function PlateArmor({ anchors }: ArmorProps): JSX.Element {
  return (
    <g>
      <At p={anchors.chest}>
        <g>
          <path d="M-21 -24 q21 -9 42 0 l-3 44 q-18 8 -36 0 Z" fill={metal} />
          <path d="M0 -22 L0 18" stroke={armorShade} strokeWidth={2} />
          <rect x={-22} y={-26} width={16} height={9} rx={3} fill={metal} />
          <rect x={6} y={-26} width={16} height={9} rx={3} fill={metal} />
        </g>
      </At>
      <At p={anchors.head}>
        <g>
          <path d="M-16 -2 a16 17 0 0 1 32 0 l0 8 q-16 5 -32 0 Z" fill={metal} />
          <rect x={-12} y={0} width={24} height={3} fill={armorShade} />
        </g>
      </At>
    </g>
  );
}
