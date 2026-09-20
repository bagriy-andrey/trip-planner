import { useFonts } from "expo-font";

import { FONT_ASSETS, useAppFonts } from "@/lib/fonts";
import { family } from "@/lib/theme";

describe("useAppFonts (AC-18)", () => {
  it("registers exactly the family names defined by the theme typography", () => {
    expect(Object.keys(FONT_ASSETS).sort()).toEqual(Object.values(family).sort());
  });

  it("delegates to expo-font with that map and passes the [loaded, error] tuple through", () => {
    const result = useAppFonts();
    expect(useFonts).toHaveBeenCalledWith(FONT_ASSETS);
    expect(result).toEqual([true, null]);
  });
});
