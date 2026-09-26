import type { CalendarDate } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface StayDatesFieldProps {
  checkInDate: CalendarDate | null;
  checkOutDate: CalendarDate | null;
  /** The dates sheet is drawn by the screen (it must sit outside the scroll view); a tap asks to open it. */
  onOpen: () => void;
  /** Missing-date / stay-too-long problems, already translated; each is shown on its own line. */
  errorTexts?: readonly string[];
  testID: string;
}

/** The stay's ONE range field: shows "from - to" and a tap opens the dates sheet (same as trip, flight and car). */
export function StayDatesField({
  checkInDate,
  checkOutDate,
  onOpen,
  errorTexts = [],
  testID,
}: StayDatesFieldProps) {
  const { t, i18n } = useTranslation("hotel");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const hasRange = checkInDate !== null && checkOutDate !== null;
  const fieldText = hasRange ? formatCalendarRange(locale, checkInDate, checkOutDate) : t("form.field.datesChoose");

  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {t("form.field.dates")}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasRange ? t("form.a11y.datesField", { value: fieldText }) : fieldText}
        onPress={onOpen}
        testID={`${testID}-field`}
        style={[
          styles.field,
          { backgroundColor: tokens.surface, borderColor: errorTexts.length > 0 ? tokens.danger : tokens.surfaceBorder },
        ]}
      >
        <AppText variant={hasRange ? "mono" : "body"} color={hasRange ? "text" : "textSecondary"}>
          {fieldText}
        </AppText>
        <Icon name="calendar" color="textSecondary" />
      </Pressable>
      {errorTexts.map((message) => (
        <AppText key={message} variant="small" color="danger" accessibilityRole="alert">
          {message}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  field: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
