import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, GlassSurface, Icon, IconButton, Pill, SoonBadge } from "@/components";
import type { IconName } from "@/components";
import { radius, spacing, useTheme } from "@/lib/theme";

const HERO_HEIGHT = 260;
const ROUND_BUTTON = 44;

export interface TripHeroProps {
  /** Already translated city name. */
  city: string;
  /** Range and nights, e.g. "Sep 24 – 30, 2026 · 6 nights". Mono (AC-38). Null for a draft without dates. */
  dateLine: string | null;
  /** Already translated status text, drawn in the accent pill. */
  statusLabel: string;
  backLabel: string;
  moreLabel: string;
  /** Spoken hint for the "more" stub (Q7: it does nothing yet). */
  moreHint: string;
  onBack: () => void;
}

/** A round glass button sitting on the cover; the scrim keeps its glyph legible in both themes (AC-22). */
function RoundGlassButton({
  label,
  hint,
  icon,
  onPress,
  testID,
}: {
  label: string;
  hint?: string;
  icon: IconName;
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
        <Icon name={icon} />
      </IconButton>
    </GlassSurface>
  );
}

/** Cover placeholder (no images in the skeleton) with back / "more" controls and the glass info panel. */
export function TripHero({ city, dateLine, statusLabel, backLabel, moreLabel, moreHint, onBack }: TripHeroProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="trip-hero"
      style={[styles.hero, { backgroundColor: tokens.divider, paddingTop: insets.top + spacing.sm }]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.accent, opacity: 0.7 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverScrim }]} />
      <View style={styles.topRow}>
        <RoundGlassButton label={backLabel} icon="back" onPress={onBack} testID="trip-hero-back" />
        <View style={styles.moreGroup}>
          <SoonBadge />
          <RoundGlassButton
            label={moreLabel}
            hint={moreHint}
            icon="more"
            testID="trip-hero-more"
          />
        </View>
      </View>
      <GlassSurface strengthen style={styles.panel}>
        <AppText variant="cityHero" numberOfLines={1} ellipsizeMode="tail" accessibilityRole="header">
          {city}
        </AppText>
        <View style={styles.meta}>
          <Pill tone="accent" label={statusLabel} />
          {dateLine !== null ? (
            <AppText variant="monoSmall" color="textSecondary" style={styles.dates}>
              {dateLine}
            </AppText>
          ) : null}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: HERO_HEIGHT,
    justifyContent: "space-between",
    padding: spacing.screenX,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moreGroup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  round: { width: ROUND_BUTTON, height: ROUND_BUTTON, borderRadius: radius.pill },
  panel: { padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs },
  dates: { flexShrink: 1 },
});
