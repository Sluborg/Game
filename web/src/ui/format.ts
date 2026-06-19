// Number formatting, mirroring GoldBar.kt (M for millions, K for thousands).

export function formatGold(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.floor(value)}`;
}
