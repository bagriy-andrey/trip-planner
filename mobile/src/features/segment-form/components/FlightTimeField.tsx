import type { ClockTime } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface FlightTimeFieldProps {
  label: string;
  time: ClockTime | null;
  /** A tap anywhere opens the time sheet; an empty field stays empty until the user confirms. */
  onOpen: () => void;
  /** Optional fields only: a × next to the value puts the field back to "not chosen". */
  onClear?: () => void;
  clearLabel?: string;
  errorText?: string;
  testID: string;
}

/** A time-shaped field of the flight (departure time, duration): mono value or a clock icon while empty. */
export function FlightTimeField({ label, time, onOpen, onClear, clearLabel, errorText, testID }: FlightTimeFieldProps) {
  const { tokens } = useTheme();
  const hasError = errorText !== undefined && errorText !== "";
  return (
    <View style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={time === null ? label : `${label}: ${time}`}
          onPress={onOpen}
          testID={testID}
          style={[
            styles.field,
            { backgroundColor: tokens.surface, borderColor: hasError ? tokens.danger : tokens.surfaceBorder },
          ]}
        >
          {time === null ? <Icon name="clock" color="textSecondary" /> : <AppText variant="mono">{time}</AppText>}
        </Pressable>
        {time !== null && onClear !== undefined ? (
          <IconButton filled={false} accessibilityLabel={clearLabel ?? label} onPress={onClear} testID={`${testID}-clear`}>
            <Icon name="close" color="textSecondary" />
          </IconButton>
        ) : null}
      </View>
      {hasError ? (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  field: {
    flex: 1,
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
