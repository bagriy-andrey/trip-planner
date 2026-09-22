import { StyleSheet, View } from "react-native";
import type { Segment } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon, PressableRow } from "@/components";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
// `formatSegmentDateTime` is not re-exported by `lib/i18n`'s barrel (a step-4 gap found while
// building this component) — imported straight from its module.
import { formatSegmentDateTime } from "@/lib/i18n/format";
import { radius, spacing } from "@/lib/theme";

export interface SegmentCardProps {
  segment: Segment;
  locale: Locale;
  /** Reports the tapped segment's id; the caller (Step 8/9) decides where "edit" leads. */
  onPress: (segmentId: string) => void;
  testID?: string;
}

/**
 * One chain link (AC-64, design/screens/route.md "Цепочка"): two compact lines — the airport
 * codes with a route arrow and a trailing chevron, then the DEPARTURE date/time in the departure
 * airport's own zone (never UTC — a card that defaults shows the wrong wall-clock time,
 * `mobile/insights.md`) with the flight number at `textTertiary`. Only the codes, the date/time
 * and the flight number are mono (AGENTS.md "Дизайн и стили" — ticket data only); the tap reports
 * the segment id, the actual navigation target is wired once the segment-form route exists
 * (Step 9).
 */
export function SegmentCard({ segment, locale, onPress, testID }: SegmentCardProps) {
  const { t } = useTranslation("tripDetail");
  const route = t("flight.route", { from: segment.from.iata, to: segment.to.iata });
  const dateTime = formatSegmentDateTime(locale, segment.departureAt, segment.from.timeZone);
  const label =
    segment.flightNumber === null ? `${route}, ${dateTime}` : `${route}, ${dateTime}, ${segment.flightNumber}`;

  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(segment.id)}
      testID={testID}
      style={styles.pressable}
    >
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <View style={styles.codes}>
            <AppText variant="mono">{segment.from.iata}</AppText>
            <Icon name="forward" size="sm" color="textSecondary" />
            <AppText variant="mono">{segment.to.iata}</AppText>
          </View>
          <Icon name="chevron" color="textTertiary" />
        </View>
        <View style={styles.row}>
          <AppText variant="monoSmall" color="textSecondary">
            {dateTime}
          </AppText>
          {segment.flightNumber !== null ? (
            <AppText variant="monoSmall" color="textTertiary">
              {segment.flightNumber}
            </AppText>
          ) : null}
        </View>
      </GlassSurface>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  pressable: { width: "100%" },
  card: { width: "100%", padding: spacing.lg, borderRadius: radius.card, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  codes: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
