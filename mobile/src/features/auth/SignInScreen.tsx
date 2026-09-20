import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, PlaceholderField, PressableRow, PrimaryButton, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { AuthFooterLink } from "./components/AuthFooterLink";
import { OrDivider } from "./components/OrDivider";
import { SocialAuthButtons } from "./components/SocialAuthButtons";

/** S2 — sign in. The skeleton validates nothing: "Sign in" just enters the tabs (AC-7). */
export function SignInScreen() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  return (
    <Screen testID="sign-in-screen" contentStyle={styles.content}>
      <AppText variant="authTitle" accessibilityRole="header">
        {t("signIn.title")}
      </AppText>
      <SocialAuthButtons />
      <OrDivider />
      <View style={styles.fields}>
        <PlaceholderField
          label={t("fields.email.label")}
          placeholder={t("fields.email.placeholder")}
        />
        <PlaceholderField
          label={t("fields.password.label")}
          placeholder={t("fields.password.placeholder")}
          secure
        />
        <PressableRow
          accessibilityRole="link"
          accessibilityLabel={t("signIn.forgotPassword")}
          onPress={() => router.push("/forgot-password")}
          style={styles.forgot}
        >
          <AppText color="accent">{t("signIn.forgotPassword")}</AppText>
        </PressableRow>
      </View>
      <PrimaryButton
        label={t("signIn.submit")}
        accessibilityLabel={t("signIn.submit")}
        onPress={() => router.replace("/trips")}
        testID="sign-in-submit"
      />
      <AuthFooterLink
        prompt={t("signIn.noAccountPrompt")}
        linkLabel={t("signIn.createLink")}
        onPress={() => router.navigate("/sign-up")}
        testID="sign-in-create"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  fields: { gap: spacing.md },
  forgot: { alignSelf: "flex-end" },
});
