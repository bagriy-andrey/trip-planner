// Font families, sizes and text roles (AC-17). Values are canonical in
// `design/tokens.md` ("Типографика"). Family names must match the keys registered
// by `useAppFonts` (expo-font + @expo-google-fonts/*). Manrope 600 is not used.
// Manrope: all UI text. IBM Plex Mono: "ticket" data only (airport codes,
// card dates, flight/ticket/policy numbers, seats) — never titles or buttons.
//
// Roles deliberately set no absolute `lineHeight`: a fixed pixel line height
// would clip text under Dynamic Type at large sizes (AC-21).

export const family = {
  display: "Manrope_800ExtraBold",
  bold: "Manrope_700Bold",
  medium: "Manrope_500Medium",
  regular: "Manrope_400Regular",
  mono: "IBMPlexMono_500Medium",
} as const;

export const size = {
  /** Onboarding title. */
  hero: 32,
  /** Sign-in / sign-up titles. */
  authTitle: 28,
  /** Section screen title. */
  h1: 26,
  /** City name in the trip-detail hero. */
  cityHero: 24,
  /** City name on a trip card. */
  cardTitle: 19,
  /** Section title. */
  h2: 17,
  body: 15,
  small: 13,
  caption: 12,
  /** Tab labels, chips. */
  micro: 11,
} as const;

export const typography = {
  hero: { fontFamily: family.display, fontSize: size.hero },
  authTitle: { fontFamily: family.display, fontSize: size.authTitle },
  h1: { fontFamily: family.display, fontSize: size.h1 },
  cityHero: { fontFamily: family.display, fontSize: size.cityHero },
  cardTitle: { fontFamily: family.display, fontSize: size.cardTitle },
  h2: { fontFamily: family.bold, fontSize: size.h2 },
  button: { fontFamily: family.bold, fontSize: size.body },
  body: { fontFamily: family.medium, fontSize: size.body },
  small: { fontFamily: family.medium, fontSize: size.small },
  caption: { fontFamily: family.medium, fontSize: size.caption },
  micro: { fontFamily: family.medium, fontSize: size.micro },
  mono: { fontFamily: family.mono, fontSize: size.body },
  monoSmall: { fontFamily: family.mono, fontSize: size.small },
} as const;

export type TypographyRole = keyof typeof typography;
