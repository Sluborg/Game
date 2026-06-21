// Weapon layers. Each weapon is drawn around a grip at local (0,0); UnitSprite
// translates it to the body's hand anchor and rotates it. Colours via tokens.

import type { JSX } from "react";

const metal = "var(--sprite-metal)";
const wood = "var(--sprite-skin-shade)";
const outline = "var(--sprite-outline)";
const gold = "var(--c-gold-dark)";

export function Dagger(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.2}>
      <rect x={-2} y={-2} width={4} height={10} rx={1.5} fill={wood} />
      <rect x={-5} y={-4} width={10} height={3} rx={1} fill={gold} />
      <path d="M-2 -4 L0 -22 L2 -4 Z" fill={metal} />
    </g>
  );
}

export function Sword(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.2}>
      <rect x={-2} y={-2} width={4} height={12} rx={1.5} fill={wood} />
      <rect x={-7} y={-4} width={14} height={3.4} rx={1} fill={gold} />
      <path d="M-2.6 -4 L0 -40 L2.6 -4 Z" fill={metal} />
    </g>
  );
}

export function Greataxe(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.2}>
      <rect x={-2} y={-6} width={4} height={36} rx={2} fill={wood} />
      <path d="M2 -34 q22 2 18 22 q-12 -10 -18 -8 Z" fill={metal} />
      <path d="M-2 -34 q-22 2 -18 22 q12 -10 18 -8 Z" fill={metal} />
    </g>
  );
}

export function Cleaver(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.2}>
      <rect x={-2} y={-2} width={4} height={11} rx={1.5} fill={wood} />
      <path d="M-3 -4 L-3 -30 L9 -28 L7 -4 Z" fill={metal} />
    </g>
  );
}

export function Club(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.2}>
      <rect x={-2.5} y={-6} width={5} height={20} rx={2} fill={wood} />
      <path d="M0 -28 q12 2 10 14 q-10 4 -20 0 q-2 -12 10 -14 Z" fill={wood} />
      <circle cx={-4} cy={-22} r={1.6} fill={outline} />
      <circle cx={4} cy={-18} r={1.6} fill={outline} />
    </g>
  );
}

export function Greatclub(): JSX.Element {
  return (
    <g stroke={outline} strokeWidth={1.4}>
      <rect x={-3} y={-4} width={6} height={32} rx={2.5} fill={wood} />
      <path d="M0 -40 q16 3 14 18 q-14 6 -28 0 q-2 -15 14 -18 Z" fill={wood} />
      <circle cx={-6} cy={-32} r={2} fill={outline} />
      <circle cx={5} cy={-26} r={2} fill={outline} />
      <circle cx={-2} cy={-22} r={2} fill={outline} />
    </g>
  );
}
