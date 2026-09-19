import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, GlassSurface, IconButton, Pill, SoonBadge } from "@/components";
import { radii, spacing, useTheme } from "@/lib/theme";

const HERO_HEIGHT = 260;
const ROUND_BUTTON = 44;

// Glyphs, not translatable copy.
const BACK = "‹";
const MORE = "…";

export interface TripHeroProps {
  /** Already translated city name. */
  city: string;
  /** Range and nights, e.g. "Sep 24 – 30, 2026 · 6 nights". Mono (AC-38). */
  dateLine: string;
  /** Already translated status text, drawn in the accent pill. */
  statusLabel: string;
  backLabel: string;
  moreLabel: string;
  /** Spoken hint for the "…" stub (Q7: it does nothing yet). */
  moreHint: string;
  onBack: () => void;
}

/** A round glass button sitting on the cover; the scrim keeps its glyph legible in both themes (AC-22). */
function RoundGlassButton({
  label,
  hint,
  glyph,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  glyph: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <GlassSurface strengthen style={styles.round}>
      <IconButton
        filled={false}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onPress={onPress}
        testID={testID}
      >
        <AppText variant="title">{glyph}</AppText>
      </IconButton>
    </GlassSurface>
  );
}

/** Cover placeholder (no images in the skeleton) with back / "…" controls and the glass info panel. */
export function TripHero({ city, dateLine, statusLabel, backLabel, moreLabel, moreHint, onBack }: TripHeroProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="trip-hero"
      style={[styles.hero, { backgroundColor: tokens.pill, paddingTop: insets.top + spacing.sm }]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.accent, opacity: 0.7 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverOverlay }]} />
      <View style={styles.topRow}>
        <RoundGlassButton label={backLabel} glyph={BACK} onPress={onBack} testID="trip-hero-back" />
        <View style={styles.moreGroup}>
          <SoonBadge />
          <RoundGlassButton
            label={moreLabel}
            hint={moreHint}
            glyph={MORE}
            testID="trip-hero-more"
          />
        </View>
      </View>
      <GlassSurface strengthen style={styles.panel}>
        <AppText variant="display" numberOfLines={1} ellipsizeMode="tail" accessibilityRole="header">
          {city}
        </AppText>
        <View style={styles.meta}>
          <Pill tone="accent" label={statusLabel} />
          <AppText variant="monoSmall" color="textMuted" style={styles.dates}>
            {dateLine}
          </AppText>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: HERO_HEIGHT,
    justifyContent: "space-between",
    padding: spacing.lg,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moreGroup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  round: { width: ROUND_BUTTON, height: ROUND_BUTTON, borderRadius: radii.pill },
  panel: { padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs },
  dates: { flexShrink: 1 },
});
