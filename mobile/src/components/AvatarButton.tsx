import { Pressable, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Avatar } from "./Avatar";
import { MIN_HIT_SIZE } from "./a11y";
import type { AccessibleProps } from "./a11y";

export interface AvatarButtonProps extends AccessibleProps {
  initials: string;
  onPress?: () => void;
  /** Visible circle diameter; the touch target stays at least 44x44 (AC-20). */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function AvatarButton({
  initials,
  onPress,
  size = 36,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: AvatarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.hitArea, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Avatar initials={initials} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    minWidth: MIN_HIT_SIZE,
    minHeight: MIN_HIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
