import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { AppText, PlaceholderField, PressableRow, PrimaryButton, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

/** S10 — password recovery stub. "Back" and "Send link" both return to sign-in (S2). */
export function ForgotPasswordScreen() {
  const { t } = useTranslation(["auth", "common"]);
  const router = useRouter();
  // S10 is normally pushed from S2, so `back()` lands on it. A cold deep link has
  // no history: fall back to S2 explicitly instead of doing nothing.
  const returnToSignIn = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  };
  return (
    <Screen testID="forgot-password-screen" contentStyle={styles.content}>
      <PressableRow
        accessibilityLabel={t("common:actions.back")}
        onPress={returnToSignIn}
        style={styles.back}
        testID="forgot-password-back"
      >
        <AppText color="accent">{t("common:actions.back")}</AppText>
      </PressableRow>
      <AppText variant="authTitle" accessibilityRole="header">
        {t("auth:forgotPassword.title")}
      </AppText>
      <AppText color="textSecondary">{t("auth:forgotPassword.description")}</AppText>
      <PlaceholderField
        label={t("auth:fields.email.label")}
        placeholder={t("auth:fields.email.placeholder")}
      />
      <PrimaryButton
        label={t("auth:forgotPassword.submit")}
        accessibilityLabel={t("auth:forgotPassword.submit")}
        onPress={returnToSignIn}
        testID="forgot-password-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  back: { alignSelf: "flex-start" },
});
