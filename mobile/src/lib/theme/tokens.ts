// Single source of truth for colours (AC-16). Values and names are canonical in
// `design/tokens.md`: change a value there first, then here. Screens never carry
// a hex/rgba literal of their own.

export interface ThemeTokens {
  /** Screen background. */
  bg: string;
  /** Glass panel fill: cards, inputs. */
  surface: string;
  /** Denser glass over an image, or the tab bar. */
  surfaceStrong: string;
  /** Glass panel border; always paired with a `surface*` fill. */
  surfaceBorder: string;
  /** Row separators, inactive fills, indicator dots, disabled button background. */
  divider: string;
  text: string;
  /** Explanatory text: captions, placeholders. */
  textSecondary: string;
  /** Service text: hints, empty dates, disabled labels. */
  textTertiary: string;
  tabInactive: string;
  accent: string;
  /** Text/icon colour drawn on top of `accent`; dark in both themes. */
  onAccent: string;
  /** Warning chip fill (e.g. an expiring insurance policy). */
  warnBg: string;
  warnBorder: string;
  /** Destructive actions and field errors only. */
  danger: string;
  /** Dimming under a modal sheet. */
  scrim: string;
  /** Thin dimming of a cover under the glass panel (keeps text ≥ 4.5:1). */
  coverScrim: string;
  /** "Continue with Apple" button: light on dark theme, dark on light theme. */
  invertedPill: string;
  invertedPillText: string;
}

export const darkTokens = {
  bg: "#0B0D11",
  surface: "rgba(255,255,255,0.07)",
  surfaceStrong: "rgba(255,255,255,0.13)",
  surfaceBorder: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.12)",
  text: "#F5F6F7",
  textSecondary: "rgba(245,246,247,0.62)",
  textTertiary: "rgba(245,246,247,0.40)",
  tabInactive: "rgba(245,246,247,0.42)",
  accent: "#F2A93B",
  onAccent: "#14171C",
  warnBg: "rgba(242,169,59,0.10)",
  warnBorder: "rgba(242,169,59,0.30)",
  danger: "#D96B5A",
  scrim: "rgba(0,0,0,0.50)",
  coverScrim: "rgba(0,0,0,0.18)",
  invertedPill: "#F5F6F7",
  invertedPillText: "#14171C",
} as const satisfies ThemeTokens;

export const lightTokens = {
  bg: "#F3F1EC",
  surface: "rgba(255,255,255,0.55)",
  surfaceStrong: "rgba(255,255,255,0.80)",
  surfaceBorder: "rgba(20,23,28,0.09)",
  divider: "rgba(20,23,28,0.10)",
  text: "#14171C",
  textSecondary: "rgba(20,23,28,0.58)",
  textTertiary: "rgba(20,23,28,0.40)",
  tabInactive: "rgba(20,23,28,0.40)",
  accent: "#F2A93B",
  onAccent: "#14171C",
  warnBg: "rgba(242,169,59,0.14)",
  warnBorder: "rgba(242,169,59,0.40)",
  danger: "#B3452F",
  scrim: "rgba(0,0,0,0.35)",
  coverScrim: "rgba(0,0,0,0.22)",
  invertedPill: "#14171C",
  invertedPillText: "#F5F6F7",
} as const satisfies ThemeTokens;

/** Trip-cover placeholder colours; pick one deterministically by city name. */
export const coverColors = ["#1F4F4A", "#8C4A34", "#33384F", "#7A4A6B", "#4A5A3A"] as const;
