// Color palette, ported verbatim from ui/theme/Color.kt.

export const colors = {
  royalPurple: "#6A2FBF",
  royalPurpleLight: "#9D6BE8",
  royalPurpleDeep: "#2E1065",
  goldCoin: "#FFD700",
  goldLight: "#FFE98A",
  goldDark: "#B8860B",
  stoneDark: "#222238",
  stoneLight: "#32324E",
  parchmentBeige: "#F4E4BC",
  parchmentDark: "#C9B391",
  bloodRed: "#E05252",
  bloodRedDeep: "#7A1F2B",
  forestGreen: "#52C46B",
  skyBlue: "#87CEEB",
  nightBlue: "#12122A",
  nightBlueDeep: "#0A0A1A",
  emberOrange: "#FF9D45",
} as const;

/** Color a battle-log line by keyword, mirroring BattleLog.kt. */
export function logColor(line: string): string {
  if (line.includes("⚠️") || line.includes("👑")) return colors.bloodRed;
  if (line.includes("💥")) return colors.emberOrange;
  if (line.includes("⬆") || line.includes("Level")) return colors.royalPurpleLight;
  if (line.includes("🏆") || line.includes("🗡")) return colors.goldCoin;
  return colors.parchmentBeige;
}
