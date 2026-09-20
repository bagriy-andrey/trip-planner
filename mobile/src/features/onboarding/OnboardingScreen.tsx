import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, PrimaryButton, Screen } from "@/components";
import { AuthFooterLink } from "@/features/auth";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { APP_NAME } from "../../../app.constants";
import { DotsIndicator } from "./components/DotsIndicator";

const PAGE_COUNT = 3;

/** S1 — onboarding: the first screen of a cold start. */
export function OnboardingScreen() {
  const { t } = useTranslation("onboarding");
  const router = useRouter();
  return (
    <Screen testID="onboarding-screen" contentStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="h2" color="accent" testID="onboarding-app-name">
          {APP_NAME}
        </AppText>
        <AppText variant="hero" accessibilityRole="header">
          {t("title")}
        </AppText>
        <AppText color="textSecondary">{t("subtitle")}</AppText>
      </View>
      <View style={styles.actions}>
        <DotsIndicator total={PAGE_COUNT} current={1} />
        <PrimaryButton
          label={t("start")}
          accessibilityLabel={t("start")}
          onPress={() => router.push("/sign-up")}
          testID="onboarding-start"
        />
        <AuthFooterLink
          prompt={t("hasAccountPrompt")}
          linkLabel={t("signInLink")}
          onPress={() => router.push("/sign-in")}
          testID="onboarding-signin"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "space-between", gap: spacing.xxl, paddingVertical: spacing.xl },
  hero: { gap: spacing.md, paddingTop: spacing.xxl },
  actions: { gap: spacing.xl },
});
