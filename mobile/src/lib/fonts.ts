// Font loading (AC-18). Family names come from theme/typography.ts (the single
// source of truth); this file only maps each name to its bundled asset.
// Deep imports keep unused weights out of the bundle.
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { useFonts } from "expo-font";

import { FONT_FAMILY } from "@/lib/theme";

type FontFamilyName = (typeof FONT_FAMILY)[keyof typeof FONT_FAMILY];

// `Record` over the family-name union: adding a family to FONT_FAMILY without an
// asset here is a compile error.
export const FONT_ASSETS: Record<FontFamilyName, number> = {
  [FONT_FAMILY.regular]: Manrope_400Regular,
  [FONT_FAMILY.semiBold]: Manrope_600SemiBold,
  [FONT_FAMILY.bold]: Manrope_700Bold,
  [FONT_FAMILY.mono]: IBMPlexMono_400Regular,
  [FONT_FAMILY.monoMedium]: IBMPlexMono_500Medium,
};

/** `[loaded, error]` — the splash gate holds until `loaded` (or `error`). */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts(FONT_ASSETS);
}
