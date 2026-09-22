import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

import type { AccessibleProps } from "./a11y";
import { Icon } from "./Icon";

export interface CheckboxProps extends AccessibleProps {
  checked: boolean;
  /** Receives the NEW state; the parent owns it (controlled component). */
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bare checkbox control: no text inside. The caller renders the visible caption next to it and
 * passes the same words as `accessibilityLabel`, so VoiceOver reads "<label>, checkbox, checked".
 * The touch target is `layout.minTouch` square while the drawn box stays smaller (AC-70).
 */
export function Checkbox({
  checked,
  onChange,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CheckboxProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      testID={testID}
      style={({ pressed }) => [
        styles.target,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? tokens.accent : "transparent",
            borderColor: checked ? tokens.accent : tokens.textSecondary,
          },
        ]}
      >
        {checked ? <Icon name="check" size="sm" color="onAccent" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    minWidth: layout.minTouch,
    minHeight: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
  },
  // The drawn box has no dedicated theme token yet; it borrows the 24pt step of the spacing scale.
  box: {
    width: spacing.xl,
    height: spacing.xl,
    borderRadius: radius.tile,
    borderWidth: layout.borderWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
