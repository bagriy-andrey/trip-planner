import type { ClockTime } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface StayTimeFieldProps {
  /** "Время заезда" / "Время выезда". */
  label: string;
  time: ClockTime | null;
  /** Tap anywhere on the field: the screen opens the time sheet (an empty field stays empty until confirmed). */
  onOpen: () => void;
  /** "x": back to "not set". */
  onClear: () => void;
  errorText?: string;
  testID: string;
}

/** One OPTIONAL time of the stay: a tap opens the time sheet at once, "×" clears it back to "not set". */
export function StayTimeField({ label, time, onOpen, onClear, errorText, testID }: StayTimeFieldProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.control}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={time === null ? label : `${label}: ${time}`}
          onPress={onOpen}
          testID={time === null ? `${testID}-empty` : `${testID}-value`}
          style={[styles.field, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
        >
          {time === null ? <Icon name="clock" color="textSecondary" /> : <AppText variant="mono">{time}</AppText>}
        </Pressable>
        {time !== null ? (
          <IconButton
            filled={false}
            accessibilityLabel={`${t("form.a11y.clear")}: ${label}`}
            onPress={onClear}
            testID={`${testID}-clear`}
          >
            <Icon name="close" color="textSecondary" />
          </IconButton>
        ) : null}
      </View>
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
  control: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
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
