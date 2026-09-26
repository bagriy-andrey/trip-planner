import type { CalendarDate } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface FlightDateFieldProps {
  label: string;
  date: CalendarDate | null;
  /** A tap anywhere opens the date sheet; an empty field stays empty until the user confirms. */
  onOpen: () => void;
  errorText?: string;
  testID: string;
}

/** The departure DATE: one full-width field, mono value + calendar icon on the right (as the rental dates). */
export function FlightDateField({ label, date, onOpen, errorText, testID }: FlightDateFieldProps) {
  const { i18n } = useTranslation();
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const hasError = errorText !== undefined && errorText !== "";
  return (
    <View style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={date === null ? label : `${label}: ${formatCalendarDate(locale, date)}`}
        onPress={onOpen}
        testID={testID}
        style={[
          styles.field,
          { backgroundColor: tokens.surface, borderColor: hasError ? tokens.danger : tokens.surfaceBorder },
        ]}
      >
        {date === null ? <View /> : <AppText variant="mono">{formatCalendarDate(locale, date)}</AppText>}
        <Icon name="calendar" color="textSecondary" />
      </Pressable>
      {hasError ? (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  field: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
