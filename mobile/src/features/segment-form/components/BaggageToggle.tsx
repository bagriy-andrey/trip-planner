import { Pressable, StyleSheet, View } from "react-native";

import { AppText, MIN_HIT_SIZE } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface BaggageToggleProps {
  /** Already translated caption ("Baggage included"); also the spoken name. */
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

/** Half the track that is not covered by the knob, both sides (24pt track, 20pt knob). */
const KNOB_INSET = (layout.switchH - layout.switchKnob) / 2;

/**
 * "Baggage included" — this feature's OWN working toggle (the `booking-form` one is an inert
 * skeleton stub, never reused here). A custom 44x24 pill (`design/screens/add-flight.md` "пилюля
 * 44x24"), not the native `Switch`: its cross-platform size can't be pinned to that exact box.
 */
export function BaggageToggle({ label, value, onChange, testID }: BaggageToggleProps) {
  const { tokens } = useTheme();
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        accessibilityLabel={label}
        onPress={() => onChange(!value)}
        testID={testID}
        style={styles.hitArea}
      >
        <View
          style={[
            styles.track,
            { backgroundColor: value ? tokens.accent : tokens.divider },
          ]}
        >
          <View
            style={[
              styles.knob,
              {
                backgroundColor: tokens.bg,
                transform: [{ translateX: value ? layout.switchW - layout.switchKnob - KNOB_INSET : KNOB_INSET }],
              },
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_HIT_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: { flexShrink: 1 },
  hitArea: { minWidth: MIN_HIT_SIZE, minHeight: MIN_HIT_SIZE, alignItems: "center", justifyContent: "center" },
  track: {
    width: layout.switchW,
    height: layout.switchH,
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    width: layout.switchKnob,
    height: layout.switchKnob,
    borderRadius: radius.pill,
  },
});
