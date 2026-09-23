import { StyleSheet, View } from "react-native";
import type { RouteWarning } from "@tripplanner/shared";

import { AppText, Icon } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

/** `route.notClosed` is rendered by `NotClosedCard`, never by a chain row. */
export type ChainWarning = Exclude<RouteWarning, { id: "route.notClosed" }>;

export interface WarningRowProps {
  warning: ChainWarning;
  testID?: string;
}

/**
 * One of the four warning kinds, rendered next to the element it concerns (AC-66). Each kind has
 * its own non-obvious text (`transport:warning.*`) — VoiceOver never has to infer meaning from the
 * icon or the row's colour alone (AC-91): `layover.risky` is a second, explanatory line next to
 * `GapRow`'s own "рискованно" chip; the other three explain something `GapRow`/`SegmentCard` alone
 * cannot show (a mismatched airport, an overlap, a date outside the trip).
 */
export function WarningRow({ warning, testID }: WarningRowProps) {
  const { t } = useTranslation("transport");
  let text: string;
  switch (warning.id) {
    case "layover.risky":
      text = t("warning.layoverRisky");
      break;
    case "airport.mismatch":
      text = t("warning.airportMismatch");
      break;
    case "segments.overlap":
      text = t("warning.segmentsOverlap");
      break;
    case "segment.outsideTripDates":
      text = t("warning.segmentOutsideTripDates");
      break;
  }
  return (
    <View accessible accessibilityLabel={text} testID={testID} style={styles.row}>
      <Icon name="warning" size="sm" color="textSecondary" />
      <AppText color="textSecondary" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  text: { flexShrink: 1 },
});
