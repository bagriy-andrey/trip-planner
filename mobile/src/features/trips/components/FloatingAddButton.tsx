import { Pressable, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Icon, MIN_HIT_SIZE } from "@/components";
import type { AccessibleProps } from "@/components";
import { layout, useTheme } from "@/lib/theme";

const SIZE = 56;

export interface FloatingAddButtonProps extends AccessibleProps {
  onPress: () => void;
  /** Placement (absolute position) is the screen's decision. */
  style?: StyleProp<ViewStyle>;
}

/** Round accent "+" that floats over the list (S4). */
export function FloatingAddButton({
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: FloatingAddButtonProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tokens.accent, borderColor: tokens.surfaceBorder, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Icon name="plus" size="lg" color="onAccent" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    minWidth: MIN_HIT_SIZE,
    minHeight: MIN_HIT_SIZE,
    borderRadius: SIZE / 2,
    borderWidth: layout.borderWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
