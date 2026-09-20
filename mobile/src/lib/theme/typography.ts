// Font families and text roles (AC-17). Family names must match the keys
// registered by `useAppFonts` (expo-font + @expo-google-fonts/*).
// Manrope: all UI text. IBM Plex Mono: "ticket" data only (airport codes,
// dates/ranges, ticket numbers, seats).
//
// Roles deliberately set no absolute `lineHeight`: a fixed pixel line height
// would clip text under Dynamic Type at large sizes (AC-21).

export const FONT_FAMILY = {
  regular: "Manrope_400Regular",
  semiBold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

export const typography = {
  display: { fontFamily: FONT_FAMILY.bold, fontSize: 32 },
  title: { fontFamily: FONT_FAMILY.semiBold, fontSize: 20 },
  body: { fontFamily: FONT_FAMILY.regular, fontSize: 16 },
  caption: { fontFamily: FONT_FAMILY.regular, fontSize: 13 },
  mono: { fontFamily: FONT_FAMILY.monoMedium, fontSize: 16 },
  monoSmall: { fontFamily: FONT_FAMILY.mono, fontSize: 12 },
} as const;

export type TypographyRole = keyof typeof typography;
