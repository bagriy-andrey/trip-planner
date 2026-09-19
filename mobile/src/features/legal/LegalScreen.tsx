import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText, PressableRow, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface LegalScreenProps {
  kind: "terms" | "privacy";
}

/** S11 / S12 — legal text placeholder ("Text will be added later"). */
export function LegalScreen({ kind }: LegalScreenProps) {
  const { t } = useTranslation(["legal", "common"]);
  const router = useRouter();
  // Pushed from S3 in the normal flow; a cold deep link has nothing to go back to.
  const returnToSignUp = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-up");
  };
  return (
    <Screen testID={`legal-${kind}-screen`} contentStyle={styles.content}>
      <PressableRow
        accessibilityLabel={t("common:actions.back")}
        onPress={returnToSignUp}
        style={styles.back}
        testID="legal-back"
      >
        <AppText color="accent">{t("common:actions.back")}</AppText>
      </PressableRow>
      <AppText variant="display" accessibilityRole="header">
        {t(`legal:${kind}.title`)}
      </AppText>
      <AppText color="textMuted">{t("legal:placeholderBody")}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  back: { alignSelf: "flex-start" },
});
