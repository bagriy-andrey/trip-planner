import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { AppText, IconButton } from "@/components";
import { spacing } from "@/lib/theme";

// Operator glyph, not translatable copy.
const PLUS = "+";

export interface BookingSectionProps {
  /** Already translated section title. */
  title: string;
  /** Spoken name of the "+" button (e.g. "Add flight"). */
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  testID?: string;
  addTestID?: string;
}

/** A titled group of bookings with a "+" in its header. */
export function BookingSection({ title, addLabel, onAdd, children, testID, addTestID }: BookingSectionProps) {
  return (
    <View testID={testID} style={styles.section}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        <IconButton accessibilityLabel={addLabel} onPress={onAdd} testID={addTestID}>
          <AppText variant="title">{PLUS}</AppText>
        </IconButton>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  title: { flexShrink: 1 },
});
