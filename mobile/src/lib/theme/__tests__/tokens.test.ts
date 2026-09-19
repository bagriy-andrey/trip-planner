import { darkTokens, lightTokens } from "../tokens";
import { FONT_FAMILY, typography } from "../typography";

describe("colour tokens (AC-16)", () => {
  it("dark values match the brief", () => {
    expect(darkTokens.background).toBe("#0B0D11");
    expect(darkTokens.glass).toBe("rgba(255,255,255,0.07)");
    expect(darkTokens.glassBorder).toBe("rgba(255,255,255,0.14)");
    expect(darkTokens.text).toBe("#F5F6F7");
    expect(darkTokens.accent).toBe("#F2A93B");
  });

  it("light values match the brief", () => {
    expect(lightTokens.background).toBe("#F3F1EC");
    expect(lightTokens.glass).toBe("rgba(255,255,255,0.55)");
    expect(lightTokens.glassBorder).toBe("rgba(20,23,28,0.09)");
    expect(lightTokens.text).toBe("#14171C");
    expect(lightTokens.accent).toBe("#F2A93B");
  });

  it("both themes define the same set of tokens", () => {
    expect(Object.keys(lightTokens).sort()).toEqual(Object.keys(darkTokens).sort());
  });
});

describe("typography (AC-17)", () => {
  it("defines the font families once", () => {
    expect(FONT_FAMILY).toEqual({
      regular: "Manrope_400Regular",
      semiBold: "Manrope_600SemiBold",
      bold: "Manrope_700Bold",
      mono: "IBMPlexMono_400Regular",
      monoMedium: "IBMPlexMono_500Medium",
    });
  });

  it("uses Plex Mono only for the mono roles", () => {
    expect(Object.keys(typography).sort()).toEqual(
      ["body", "caption", "display", "mono", "monoSmall", "title"].sort(),
    );
    for (const [role, style] of Object.entries(typography)) {
      const isMonoRole = role === "mono" || role === "monoSmall";
      expect(style.fontFamily.startsWith("IBMPlexMono")).toBe(isMonoRole);
      expect(style.fontFamily.startsWith("Manrope")).toBe(!isMonoRole);
    }
  });

  it("sets no absolute lineHeight (Dynamic Type, AC-21)", () => {
    for (const style of Object.values(typography)) {
      expect(style).not.toHaveProperty("lineHeight");
    }
  });
});
