import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { AppText, Icon, IconButton } from "@/components";
import { spacing } from "@/lib/theme";

export interface BookingSectionProps {
  /** Already translated section title. */
  title: string;
  /** Spoken name of the "+" button (e.g. "Add flight"). */
  addLabel: string;
  onAdd: () => void;
  /** Hide the header "+": an empty section already carries its own add button (one "+" per block). */
  hideAdd?: boolean;
  children: ReactNode;
  testID?: string;
  addTestID?: string;
}

/** A titled group of bookings with a "+" in its header (hidden while the section is empty). */
export function BookingSection({ title, addLabel, onAdd, hideAdd = false, children, testID, addTestID }: BookingSectionProps) {
  return (
    <View testID={testID} style={styles.section}>
      <View style={styles.header}>
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {hideAdd ? null : (
          <IconButton accessibilityLabel={addLabel} onPress={onAdd} testID={addTestID}>
            <Icon name="plus" />
          </IconButton>
        )}
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
