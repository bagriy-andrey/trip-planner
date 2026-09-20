// Single source of truth for colours, spacing and radii (AC-16).
// Core values come from the design brief token table (decision Q13); the derived
// ones (textMuted, pill, coverOverlay, onAccent) live here too so screens never
// carry a hex/rgba literal of their own.

export interface ThemeTokens {
  background: string;
  glass: string;
  glassBorder: string;
  text: string;
  accent: string;
  /** Secondary text: captions, placeholders, "soon" tags. */
  textMuted: string;
  /** Background of small status pills / chips. */
  pill: string;
  /** Scrim over trip cover placeholders so text on top stays legible. */
  coverOverlay: string;
  /** Text/icon colour drawn on top of `accent`. */
  onAccent: string;
}

export const darkTokens = {
  background: "#0B0D11",
  glass: "rgba(255,255,255,0.07)",
  glassBorder: "rgba(255,255,255,0.14)",
  text: "#F5F6F7",
  accent: "#F2A93B",
  textMuted: "rgba(245,246,247,0.62)",
  pill: "rgba(255,255,255,0.10)",
  coverOverlay: "rgba(11,13,17,0.45)",
  onAccent: "#0B0D11",
} as const satisfies ThemeTokens;

export const lightTokens = {
  background: "#F3F1EC",
  glass: "rgba(255,255,255,0.55)",
  glassBorder: "rgba(20,23,28,0.09)",
  text: "#14171C",
  accent: "#F2A93B",
  textMuted: "rgba(20,23,28,0.62)",
  pill: "rgba(20,23,28,0.07)",
  coverOverlay: "rgba(11,13,17,0.35)",
  onAccent: "#0B0D11",
} as const satisfies ThemeTokens;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;
