import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CalendarDate } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon, IconButton } from "@/components";
import type { IconName } from "@/components";
import { TripStatusPill } from "@/features/trips";
import type { TripStatusKind } from "@/features/trips";
import { formatTripDateLine, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { coverColors, layout, radius, spacing, useTheme } from "@/lib/theme";

export interface TripHeroProps {
  /** The place in the UI language; never mono (AC-68). */
  placeName: string;
  status: TripStatusKind;
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  /** Reference "today" for the relative status label. */
  today: CalendarDate;
  locale: Locale;
  /** Picks the cover colour (from the immutable trip id). */
  coverIndex: number;
  backLabel: string;
  moreLabel: string;
  onBack: () => void;
  onMore: () => void;
}

/** A round glass button sitting on the cover; the scrim keeps its glyph legible in both themes (AC-22). */
function RoundGlassButton({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  testID: string;
}) {
  return (
    <GlassSurface strengthen style={styles.round}>
      <IconButton filled={false} accessibilityLabel={label} onPress={onPress} testID={testID}>
        <Icon name={icon} />
      </IconButton>
    </GlassSurface>
  );
}

/**
 * Cover placeholder (no images yet) with the back / "…" buttons and the glass info panel: place,
 * status chip, and the range with the number of nights in the ticket (mono) face — or "no date
 * chosen" for a trip without dates (AC-43, AC-68).
 */
export function TripHero({
  placeName,
  status,
  startDate,
  endDate,
  today,
  locale,
  coverIndex,
  backLabel,
  moreLabel,
  onBack,
  onMore,
}: TripHeroProps) {
  const { tokens } = useTheme();
  const { t: tCommon } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const backing = coverColors[Math.abs(coverIndex) % coverColors.length] ?? coverColors[0];
  return (
    <View testID="trip-hero" style={[styles.hero, { backgroundColor: backing, paddingTop: insets.top + spacing.sm }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverScrim }]} />
      <View style={styles.topRow}>
        <RoundGlassButton label={backLabel} icon="back" onPress={onBack} testID="trip-hero-back" />
        <RoundGlassButton label={moreLabel} icon="more" onPress={onMore} testID="trip-hero-more" />
      </View>
      <GlassSurface strengthen style={styles.panel}>
        <AppText variant="cityHero" numberOfLines={1} ellipsizeMode="tail" accessibilityRole="header">
          {placeName}
        </AppText>
        <View style={styles.meta}>
          <TripStatusPill status={status} startDate={startDate} today={today} testID="trip-hero-status" />
          {startDate !== null && endDate !== null ? (
            <AppText variant="monoSmall" color="textSecondary" style={styles.dates} testID="trip-hero-dates">
              {formatTripDateLine(locale, startDate, endDate)}
            </AppText>
          ) : (
            <AppText variant="small" color="textSecondary" style={styles.dates} testID="trip-hero-dates">
              {tCommon("dates.notChosen")}
            </AppText>
          )}
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: layout.heroHeight,
    justifyContent: "space-between",
    padding: spacing.screenX,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  round: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.pill },
  panel: { padding: spacing.md, gap: spacing.xs },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs },
  dates: { flexShrink: 1 },
});
