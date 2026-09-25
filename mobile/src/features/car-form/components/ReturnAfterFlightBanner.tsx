import { StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { formatSegmentDateTime } from "@/lib/i18n/format";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface ReturnAfterFlightBannerProps {
  departureAt: Date;
  /** The departure airport's zone: the time is shown as the airport's wall clock. */
  timeZone: string;
  testID: string;
}

/** Warning, never a blocker (AC-38): the return is later than the nearest flight's departure. */
export function ReturnAfterFlightBanner({ departureAt, timeZone, testID }: ReturnAfterFlightBannerProps) {
  const { t, i18n } = useTranslation("car");
  const { tokens } = useTheme();
  const time = formatSegmentDateTime(resolveLocale([i18n.language]), departureAt, timeZone);
  return (
    <View
      accessibilityRole="alert"
      testID={testID}
      style={[styles.root, { backgroundColor: tokens.warnBg, borderColor: tokens.warnBorder }]}
    >
      <Icon name="warning" color="text" />
      <AppText style={styles.text}>{t("form.warning.returnAfterFlight", { time })}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  text: { flex: 1 },
});
