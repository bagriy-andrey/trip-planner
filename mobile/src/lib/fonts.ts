// Font loading (AC-18). Family names come from theme/typography.ts (the single
// source of truth); this file only maps each name to its bundled asset.
// Deep imports keep unused weights out of the bundle.
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { useFonts } from "expo-font";

import { family } from "@/lib/theme";

type FontFamilyName = (typeof family)[keyof typeof family];

// `Record` over the family-name union: adding a family to `family` without an
// asset here is a compile error.
export const FONT_ASSETS: Record<FontFamilyName, number> = {
  [family.display]: Manrope_800ExtraBold,
  [family.bold]: Manrope_700Bold,
  [family.medium]: Manrope_500Medium,
  [family.regular]: Manrope_400Regular,
  [family.mono]: IBMPlexMono_500Medium,
};

/** `[loaded, error]` — the splash gate holds until `loaded` (or `error`). */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(FONT_ASSETS);
}
