import type { ClockTime } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface RentalTimeFieldProps {
  /** "Pick-up time" / "Return time". */
  label: string;
  time: ClockTime | null;
  /** A tap anywhere opens the time sheet; an empty field stays empty until the user confirms (AC-20). */
  onOpen: () => void;
  errorText?: string;
  testID: string;
}

/** One REQUIRED time of the rental (mono value, no clear cross). */
export function RentalTimeField({ label, time, onOpen, errorText, testID }: RentalTimeFieldProps) {
  const { tokens } = useTheme();
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={time === null ? label : `${label}: ${time}`}
        onPress={onOpen}
        testID={time === null ? `${testID}-empty` : `${testID}-value`}
        style={[
          styles.field,
          { backgroundColor: tokens.surface, borderColor: errorText === undefined ? tokens.surfaceBorder : tokens.danger },
        ]}
      >
        {time === null ? <Icon name="clock" color="textSecondary" /> : <AppText variant="mono">{time}</AppText>}
      </Pressable>
      {errorText === undefined ? null : (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { flex: 1, gap: spacing.xs },
  field: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
