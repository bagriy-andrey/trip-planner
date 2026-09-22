import { StyleSheet } from "react-native";

import { AppText, Icon, PressableRow } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface EmptyBookingSectionProps {
  /** Already translated caption, "Add flight" (AC-45); also the spoken name. */
  caption: string;
  onAdd: () => void;
  testID?: string;
}

/**
 * The empty state of a booking block: dashed `surfaceBorder` frame, a plus icon and the caption
 * in `textSecondary`. A tap opens that module's form. No invented cards (AC-45).
 */
export function EmptyBookingSection({ caption, onAdd, testID }: EmptyBookingSectionProps) {
  const { tokens } = useTheme();
  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={caption}
      onPress={onAdd}
      testID={testID}
      style={[styles.frame, { borderColor: tokens.surfaceBorder }]}
    >
      <Icon name="plus" color="textSecondary" />
      <AppText color="textSecondary">{caption}</AppText>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  frame: {
    justifyContent: "center",
    padding: spacing.lg,
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: layout.borderWidth,
  },
});
