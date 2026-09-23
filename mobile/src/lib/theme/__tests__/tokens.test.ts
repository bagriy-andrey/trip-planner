import { blurIntensity, coverMuteSaturation, iconSize, layout, radius, spacing } from "../metrics";
import { coverColors, darkTokens, lightTokens } from "../tokens";
import { family, size, typography } from "../typography";

// Snapshot of `design/tokens.md`: a value or name changes there first, then here.
describe("colour tokens (AC-16, design/tokens.md)", () => {
  it("dark values match tokens.md", () => {
    expect(darkTokens).toEqual({
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
    });
  });

  it("light values match tokens.md", () => {
    expect(lightTokens).toEqual({
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
    });
  });

  it("both themes define the same set of tokens", () => {
    expect(Object.keys(lightTokens).sort()).toEqual(Object.keys(darkTokens).sort());
  });

  it("keeps the accent and the on-accent colour identical in both themes", () => {
    expect(lightTokens.accent).toBe(darkTokens.accent);
    expect(lightTokens.onAccent).toBe(darkTokens.onAccent);
  });

  it("defines the five cover colours", () => {
    expect(coverColors).toEqual(["#1F4F4A", "#8C4A34", "#33384F", "#7A4A6B", "#4A5A3A"]);
  });
});

describe("sizes (design/tokens.md, «Размеры и отступы»)", () => {
  it("radius", () => {
    expect(radius).toEqual({
      tile: 10,
      field: 14,
      card: 18,
      cover: 24,
      sheet: 26,
      pill: 999,
      tabBar: 32,
    });
  });

  it("layout spacing: the side margin is 20", () => {
    expect(spacing).toMatchObject({ screenX: 20, gap: 12, block: 20, section: 24 });
  });

  it("layout metrics", () => {
    expect(layout).toEqual({
      minTouch: 44,
      textAreaMinHeight: 88,
      borderWidth: 1,
      tabBarHeight: 64,
      tabBarInsetX: 24,
      tabBarBottom: 28,
      fabSize: 56,
      coverHeight: 172,
      heroHeight: 260,
      avatarHeader: 38,
      avatarProfile: 56,
      iconTile: 36,
      sectionAdd: 28,
      heroButton: 38,
      sheetTopInset: 104,
      sheetHandleW: 36,
      sheetHandleH: 4,
      dot: 6,
      dotActiveW: 20,
      switchW: 44,
      switchH: 24,
      switchKnob: 20,
      chainLine: 2,
      chainNode: 8,
      chainGapNode: 10,
      dashBorderWidth: 1.5,
    });
  });

  it("icon sizes", () => {
    expect(iconSize).toEqual({ sm: 16, md: 20, lg: 24 });
  });

  it("blur and cover muting", () => {
    expect(blurIntensity).toEqual({ panel: 20, tabBar: 24 });
    expect(coverMuteSaturation).toBe(0.55);
  });
});

describe("typography (AC-17, design/tokens.md)", () => {
  it("defines the font families once, without Manrope 600", () => {
    expect(family).toEqual({
      display: "Manrope_800ExtraBold",
      bold: "Manrope_700Bold",
      medium: "Manrope_500Medium",
      regular: "Manrope_400Regular",
      mono: "IBMPlexMono_500Medium",
    });
    expect(Object.values(family).join()).not.toMatch(/600|SemiBold/);
  });

  it("defines the size scale", () => {
    expect(size).toEqual({
      hero: 32,
      authTitle: 28,
      h1: 26,
      cityHero: 24,
      cardTitle: 19,
      h2: 17,
      body: 15,
      small: 13,
      caption: 12,
      micro: 11,
    });
  });

  it("uses Plex Mono only for the mono roles", () => {
    for (const [role, style] of Object.entries(typography)) {
      const isMonoRole = role === "mono" || role === "monoSmall";
      expect(style.fontFamily.startsWith("IBMPlexMono")).toBe(isMonoRole);
      expect(style.fontFamily.startsWith("Manrope")).toBe(!isMonoRole);
    }
  });

  it("titles are ExtraBold, section titles and buttons Bold, body text Medium", () => {
    for (const role of ["hero", "authTitle", "h1", "cityHero", "cardTitle"] as const) {
      expect(typography[role].fontFamily).toBe(family.display);
    }
    expect(typography.h2.fontFamily).toBe(family.bold);
    expect(typography.button.fontFamily).toBe(family.bold);
    for (const role of ["body", "small", "caption", "micro"] as const) {
      expect(typography[role].fontFamily).toBe(family.medium);
    }
  });

  it("sets no absolute lineHeight (Dynamic Type, AC-21)", () => {
    for (const style of Object.values(typography)) {
      expect(style).not.toHaveProperty("lineHeight");
    }
  });
});
