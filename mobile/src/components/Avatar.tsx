import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/lib/theme";

import { AppText } from "./AppText";

export interface AvatarProps {
  /** One or two letters shown in the circle. */
  initials: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Decorative user circle. Hidden from screen readers: the surrounding text/button names it. */
export function Avatar({ initials, size = 40, style }: AvatarProps) {
  const { tokens } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tokens.accent },
        style,
      ]}
    >
      <AppText variant="title" color="onAccent" numberOfLines={1}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
});
