import { Easing } from "react-native";

// Theme-independent sizes (same in light and dark). Canonical values live in
// `design/tokens.md` ("Размеры и отступы"): change a value there first, then here.

export const radius = {
  tile: 10,
  field: 14,
  card: 18,
  cover: 24,
  sheet: 26,
  pill: 999,
  tabBar: 32,
} as const;

// `screenX`…`section` are the canonical layout spacings. `xs`…`xxl` is the
// inner-padding scale the components already use (tokens.md does not define one).
export const spacing = {
  screenX: 20,
  gap: 12,
  block: 20,
  section: 24,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  minTouch: 44,
  /** Minimum height of a multiline text field. */
  textAreaMinHeight: 88,
  /** 1, not `hairlineWidth`. */
  borderWidth: 1,
  tabBarHeight: 64,
  tabBarInsetX: 24,
  tabBarBottom: 28,
  fabSize: 56,
  coverHeight: 172,
  heroHeight: 260,
  /** Avatar in a section header. */
  avatarHeader: 38,
  avatarProfile: 56,
  /** Square icon tile in a file row. */
  iconTile: 36,
  /** Round "+" button next to a section title. */
  sectionAdd: 28,
  /** Round glass buttons on the hero header. */
  heroButton: 38,
  /** Top inset of a modal sheet. */
  sheetTopInset: 104,
  sheetHandleW: 36,
  sheetHandleH: 4,
  /** A one-line label may shrink to this scale before it is cut: translated labels are longer than English ones. */
  minFontScale: 0.75,
  /** Indicator dot; the active one stretches to `dotActiveW`. */
  dot: 6,
  dotActiveW: 20,
  switchW: 44,
  switchH: 24,
  switchKnob: 20,
  /** Vertical line of the route chain (S13). */
  chainLine: 2,
  /** Filled node marking a segment card on the chain line. */
  chainNode: 8,
  /** Hollow node marking a pause (layover/stopover) on the chain line. */
  chainGapNode: 10,
  /** Dashed border of the "route not closed" warning card — heavier than `borderWidth`
   * (1) so a dashed, warning-toned border reads as distinct from the plain empty-state dash. */
  dashBorderWidth: 1.5,
} as const;

/** Icon glyph sizes: sm next to mono text/in chips, md in round buttons and the tab bar, lg on the FAB. */
export const iconSize = { sm: 16, md: 20, lg: 24 } as const;

export const blurIntensity = { panel: 20, tabBar: 24 } as const;

/** Archived covers are muted by desaturating the backdrop, NOT by opacity. */
export const coverMuteSaturation = 0.55;

/** Sheet motion, ms: the panel slides in slower than it leaves; the scrim fades over the same span. */
export const motion = { sheetEnter: 280, sheetExit: 200 } as const;

/** Decelerate on the way in, accelerate on the way out. */
export const easing = { enter: Easing.out(Easing.cubic), exit: Easing.in(Easing.cubic) } as const;
