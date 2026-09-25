import { screen } from "@testing-library/react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";

import { darkTokens, iconSize } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { Icon } from "../Icon";
import { ICONS } from "../icons";
import type { IconName } from "../icons";

// design/README.md «Иконки»: the minimum set the app needs.
const REQUIRED: IconName[] = [
  "pin", "plane", "bed", "car", "chevron", "back", "plus", "close", "check",
  "warning", "phone", "camera", "document", "image", "clock", "suitcase", "user", "calendar",
];

// Icons are decorative, so they are hidden from the accessibility tree by design.
const HIDDEN = { includeHiddenElements: true } as const;

describe("icon registry", () => {
  it("covers the required set", () => {
    for (const name of REQUIRED) expect(ICONS).toHaveProperty(name);
  });

  it("every glyph exists in its font set", () => {
    for (const [name, def] of Object.entries(ICONS)) {
      const map = def.set === "feather" ? Feather.getRawGlyphMap() : Ionicons.getRawGlyphMap();
      expect({ name, exists: def.glyph in map }).toEqual({ name, exists: true });
    }
  });

  it("only the glyphs Feather lacks come from another set", () => {
    const foreign = Object.entries(ICONS)
      .filter(([, def]) => def.set !== "feather")
      .map(([name]) => name)
      .sort();
    expect(foreign).toEqual(["bed", "car", "plane"]);
  });

  it("knows the four SPEC-07 names, all Feather", () => {
    for (const name of ["copy", "navigation", "chevronLeft", "chevronDown"] as const) {
      expect(ICONS[name].set).toBe("feather");
    }
  });
});

describe("Icon", () => {
  it("takes its colour from the theme and its size from iconSize", async () => {
    await renderWithProviders(<Icon name="pin" size="lg" color="accent" testID="icon" />);
    expect(screen.getByTestId("icon", HIDDEN)).toHaveStyle({ color: darkTokens.accent, fontSize: iconSize.lg });
  });

  it("defaults to md size and the text colour", async () => {
    await renderWithProviders(<Icon name="check" testID="icon" />);
    expect(screen.getByTestId("icon", HIDDEN)).toHaveStyle({ color: darkTokens.text, fontSize: iconSize.md });
  });

  it("is decorative: hidden from the accessibility tree", async () => {
    await renderWithProviders(<Icon name="plane" testID="icon" />);
    expect(screen.queryByTestId("icon")).toBeNull();
    expect(screen.getByTestId("icon", HIDDEN)).toBeOnTheScreen();
  });
});
