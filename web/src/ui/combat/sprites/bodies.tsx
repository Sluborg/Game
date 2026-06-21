// Body layers — one component per species, drawn in the shared viewBox. Colours
// come from CSS custom properties (set per species in sprites.module.css), so a
// body is re-skinned without touching this file, and can be swapped for richer
// art by replacing a single component in the registry.

import type { JSX } from "react";

const skin = "var(--sprite-skin)";
const skinShade = "var(--sprite-skin-shade)";
const eye = "var(--sprite-eye)";
const outline = "var(--sprite-outline)";

function Legs() {
  return (
    <g stroke={outline} strokeWidth={1.5}>
      <rect x={48} y={104} width={11} height={26} rx={4} fill={skinShade} />
      <rect x={61} y={104} width={11} height={26} rx={4} fill={skinShade} />
    </g>
  );
}

export function KnightBody(): JSX.Element {
  return (
    <g>
      <Legs />
      {/* arms */}
      <rect x={26} y={62} width={12} height={34} rx={6} fill={skin} stroke={outline} strokeWidth={1.5} />
      <rect x={82} y={62} width={12} height={34} rx={6} fill={skin} stroke={outline} strokeWidth={1.5} />
      {/* torso */}
      <rect x={40} y={58} width={40} height={50} rx={12} fill={skin} stroke={outline} strokeWidth={2} />
      {/* head */}
      <circle cx={60} cy={40} r={17} fill={skin} stroke={outline} strokeWidth={2} />
      <circle cx={54} cy={40} r={2.1} fill={eye} />
      <circle cx={66} cy={40} r={2.1} fill={eye} />
    </g>
  );
}

export function GoblinBody(): JSX.Element {
  return (
    <g>
      <Legs />
      <rect x={28} y={64} width={11} height={30} rx={5} fill={skin} stroke={outline} strokeWidth={1.5} />
      <rect x={81} y={64} width={11} height={30} rx={5} fill={skin} stroke={outline} strokeWidth={1.5} />
      <rect x={42} y={62} width={36} height={46} rx={11} fill={skin} stroke={outline} strokeWidth={2} />
      {/* pointed ears */}
      <path d="M46 40 L34 30 L48 36 Z" fill={skinShade} stroke={outline} strokeWidth={1.2} />
      <path d="M74 40 L86 30 L72 36 Z" fill={skinShade} stroke={outline} strokeWidth={1.2} />
      <circle cx={60} cy={44} r={15} fill={skin} stroke={outline} strokeWidth={2} />
      <circle cx={54} cy={45} r={2.4} fill={eye} />
      <circle cx={66} cy={45} r={2.4} fill={eye} />
      <path d="M54 52 q6 4 12 0" fill="none" stroke={outline} strokeWidth={1.4} />
    </g>
  );
}

export function OrcBody(): JSX.Element {
  return (
    <g>
      <Legs />
      <rect x={22} y={60} width={14} height={36} rx={6} fill={skin} stroke={outline} strokeWidth={1.6} />
      <rect x={84} y={60} width={14} height={36} rx={6} fill={skin} stroke={outline} strokeWidth={1.6} />
      <rect x={38} y={56} width={44} height={52} rx={12} fill={skin} stroke={outline} strokeWidth={2} />
      <circle cx={60} cy={38} r={18} fill={skin} stroke={outline} strokeWidth={2} />
      <circle cx={53} cy={38} r={2.3} fill={eye} />
      <circle cx={67} cy={38} r={2.3} fill={eye} />
      {/* tusks */}
      <path d="M54 48 l-2 7 l4 -2 Z" fill="var(--sprite-metal)" stroke={outline} strokeWidth={1} />
      <path d="M66 48 l2 7 l-4 -2 Z" fill="var(--sprite-metal)" stroke={outline} strokeWidth={1} />
    </g>
  );
}

export function TrollBody(): JSX.Element {
  return (
    <g>
      <rect x={46} y={106} width={13} height={26} rx={4} fill={skinShade} stroke={outline} strokeWidth={1.6} />
      <rect x={61} y={106} width={13} height={26} rx={4} fill={skinShade} stroke={outline} strokeWidth={1.6} />
      <rect x={18} y={58} width={16} height={40} rx={7} fill={skin} stroke={outline} strokeWidth={1.8} />
      <rect x={86} y={58} width={16} height={40} rx={7} fill={skin} stroke={outline} strokeWidth={1.8} />
      <rect x={34} y={52} width={52} height={58} rx={14} fill={skin} stroke={outline} strokeWidth={2.2} />
      <circle cx={60} cy={32} r={20} fill={skin} stroke={outline} strokeWidth={2.2} />
      <circle cx={52} cy={32} r={2.6} fill={eye} />
      <circle cx={68} cy={32} r={2.6} fill={eye} />
      <path d="M50 42 q10 6 20 0" fill="none" stroke={outline} strokeWidth={1.6} />
    </g>
  );
}
