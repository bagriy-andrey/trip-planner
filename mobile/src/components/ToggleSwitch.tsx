import { Pressable, StyleSheet, View } from "react-native";

import { layout, radius, useTheme } from "@/lib/theme";

import { MIN_HIT_SIZE } from "./a11y";

export interface ToggleSwitchProps {
  /** Already translated; the spoken name of the switch. */
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

/** Half the track that is not covered by the knob, both sides (24pt track, 20pt knob). */
const KNOB_INSET = (layout.switchH - layout.switchKnob) / 2;

/**
 * A custom 44x24 pill (`design/screens/add-flight.md` "пилюля 44x24"), not the native `Switch`:
 * its cross-platform size can't be pinned to that exact box. Hit area is at least 44x44.
 */
export function ToggleSwitch({ label, value, onChange, testID }: ToggleSwitchProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      testID={testID}
      style={styles.hitArea}
    >
      <View style={[styles.track, { backgroundColor: value ? tokens.accent : tokens.divider }]}>
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
  );
}

const styles = StyleSheet.create({
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
