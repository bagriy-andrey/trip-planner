import { ScrollView, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";
import type { ReactNode } from "react";

import { spacing, useTheme } from "@/lib/theme";

const ALL_EDGES: readonly Edge[] = ["top", "bottom", "left", "right"];

export interface ScreenProps {
  children: ReactNode;
  /** Scrollable body (default). `false` renders a plain, non-scrolling container. */
  scroll?: boolean;
  /** Safe-area edges to pad; pass fewer under a native header or a tab bar. */
  edges?: readonly Edge[];
  /** Horizontal/vertical padding of the content (default: `spacing.screenX` horizontal). */
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Screen shell: themed background, safe-area padding and, when scrolling, a
 * ScrollView that lifts content above the keyboard so a focused field or the
 * bottom button is never covered. Keyboard handling uses `ScrollView`
 * props only (no KeyboardAvoidingView, no platform fork): iOS gets
 * `automaticallyAdjustKeyboardInsets`, Android resizes the window itself.
 */
export function Screen({
  children,
  scroll = true,
  edges = ALL_EDGES,
  contentStyle,
  style,
  testID,
}: ScreenProps) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      testID={testID}
      style={[styles.root, { backgroundColor: tokens.bg }, style]}
    >
      {scroll ? (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[styles.content, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.screenX },
});
