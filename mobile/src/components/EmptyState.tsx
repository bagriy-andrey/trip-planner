import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { spacing } from "@/lib/theme";

import { AppText } from "./AppText";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Illustration/glyph node above the title. */
  icon?: ReactNode;
  /** Call-to-action node (e.g. a PrimaryButton) below the text. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, description, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon}
      <AppText variant="h2" style={styles.centered}>
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" style={styles.centered}>
          {description}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  centered: { textAlign: "center" },
});
