import { StyleSheet, View } from "react-native";

import { AppText, PressableRow } from "@/components";
import { spacing } from "@/lib/theme";

export interface AuthFooterLinkProps {
  /** Muted lead-in, e.g. "Already have an account?" (already translated). */
  prompt: string;
  /** The tappable word, e.g. "Sign in" (already translated). */
  linkLabel: string;
  onPress: () => void;
  testID?: string;
}

/** "Prompt? Link" line whose link part is the tappable target. */
export function AuthFooterLink({ prompt, linkLabel, onPress, testID }: AuthFooterLinkProps) {
  return (
    <View style={styles.row}>
      <AppText color="textMuted">{prompt}</AppText>
      <PressableRow
        accessibilityRole="link"
        accessibilityLabel={linkLabel}
        onPress={onPress}
        testID={testID}
        style={styles.link}
      >
        <AppText color="accent" variant="title">
          {linkLabel}
        </AppText>
      </PressableRow>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: spacing.sm,
  },
  link: { flexGrow: 0 },
});
