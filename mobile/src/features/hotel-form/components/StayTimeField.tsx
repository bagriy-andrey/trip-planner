import { isClockTime } from "@tripplanner/shared";
import type { ClockTime } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
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
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.control}>
        <View style={styles.picker}>
          <TimePicker
            value={time}
            onChange={(picked) => {
              if (isClockTime(picked)) onChange(picked);
            }}
            startTime={startTime}
            emptyContent={<Icon name="clock" color="textSecondary" />}
            mono
            accessibilityLabel={time === null ? label : `${label}: ${time}`}
            testID={`${testID}-picker`}
          />
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
});
