import { StyleSheet, View } from "react-native";

import { SecondaryButton, SoonBadge } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

/**
 * Apple / Google sign-in. Q7 stubs: pressable, do nothing, carry the shared
 * "soon" marker. No `onPress` on purpose — there is no provider wiring yet.
 */
export function SocialAuthButtons() {
  const { t } = useTranslation(["auth", "common"]);
  const soonHint = t("common:a11y.soonHint");
  return (
    <View style={styles.column}>
      <SecondaryButton
        label={t("auth:social.apple")}
        accessibilityLabel={t("auth:social.apple")}
        accessibilityHint={soonHint}
        leading={<SoonBadge />}
        testID="social-apple"
      />
      <SecondaryButton
        label={t("auth:social.google")}
        accessibilityLabel={t("auth:social.google")}
        accessibilityHint={soonHint}
        leading={<SoonBadge />}
        testID="social-google"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: spacing.md },
});
