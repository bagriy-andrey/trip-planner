import { isClockTime } from "@tripplanner/shared";
import type { ClockTime } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
import { TimePicker } from "@/platform/datePicker";

export interface StayTimeFieldProps {
  /** "Время заезда" / "Время выезда". */
  label: string;
  time: ClockTime | null;
  onChange: (time: ClockTime | null) => void;
  /** Time the EMPTY picker opens on (a hint only: an empty field stays empty until the user picks). */
  startTime: ClockTime;
  errorText?: string;
  testID: string;
}

/** One OPTIONAL time of the stay: tap the empty field to pick, "×" clears it back to "not set". */
export function StayTimeField({ label, time, onChange, startTime, errorText, testID }: StayTimeFieldProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.control}>
        <View style={styles.picker}>
          {time === null ? (
            // Empty: a plain button that sets the suggested time. The native compact picker laid
            // invisibly over an empty field only hits inside its own small pill (not the whole
            // field), so an empty field could not be tapped on a device. The native picker mounts
            // once a time exists, and the user adjusts it there.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => onChange(startTime)}
              testID={`${testID}-empty`}
              style={[styles.empty, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
            >
              <Icon name="clock" color="textSecondary" />
            </Pressable>
          ) : (
            <TimePicker
              value={time}
              onChange={(picked) => {
                if (isClockTime(picked)) onChange(picked);
              }}
              startTime={startTime}
              mono
              accessibilityLabel={`${label}: ${time}`}
              testID={`${testID}-picker`}
            />
          )}
        </View>
        {time !== null ? (
          <IconButton
            filled={false}
            accessibilityLabel={`${t("form.a11y.clear")}: ${label}`}
            onPress={() => onChange(null)}
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
  block: { gap: spacing.xs },
  control: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  picker: { flex: 1 },
  empty: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
