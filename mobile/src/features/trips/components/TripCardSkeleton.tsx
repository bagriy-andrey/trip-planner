import { StyleSheet, View } from "react-native";

import { layout, radius, useTheme } from "@/lib/theme";

/**
 * Placeholder of a trip card while the list loads (AC-39): the same height as a real card, so the
 * list does not jump when the data arrives. A calm `divider` block — no spinner, no shimmer.
 * Decorative: the list state announces "loading" once, the blocks themselves are hidden from
 * assistive technology.
 */
export function TripCardSkeleton({ testID }: { testID?: string }) {
  const { tokens } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[styles.skeleton, { backgroundColor: tokens.divider }]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: { minHeight: layout.coverHeight, borderRadius: radius.cover },
});
