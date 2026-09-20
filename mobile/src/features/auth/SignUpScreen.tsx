import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, PlaceholderField, PrimaryButton, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { AuthFooterLink } from "./components/AuthFooterLink";
import { ConsentText } from "./components/ConsentText";
import { OrDivider } from "./components/OrDivider";
import { SocialAuthButtons } from "./components/SocialAuthButtons";

/** S3 — sign up. The skeleton validates nothing: "Sign up" just enters the tabs (AC-7). */
export function SignUpScreen() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  return (
    <Screen testID="sign-up-screen" contentStyle={styles.content}>
      <AppText variant="display" accessibilityRole="header">
        {t("signUp.title")}
      </AppText>
      <SocialAuthButtons />
      <OrDivider />
      <View style={styles.fields}>
        <PlaceholderField
          label={t("fields.name.label")}
          placeholder={t("fields.name.placeholder")}
        />
        <PlaceholderField
          label={t("fields.email.label")}
          placeholder={t("fields.email.placeholder")}
        />
        <PlaceholderField
          label={t("fields.password.label")}
          placeholder={t("fields.password.placeholder")}
          secure
        />
      </View>
      <PrimaryButton
        label={t("signUp.submit")}
        accessibilityLabel={t("signUp.submit")}
        onPress={() => router.replace("/trips")}
        testID="sign-up-submit"
      />
      <ConsentText
        onTermsPress={() => router.push("/legal/terms")}
        onPrivacyPress={() => router.push("/legal/privacy")}
      />
      <AuthFooterLink
        prompt={t("signUp.hasAccountPrompt")}
        linkLabel={t("signUp.signInLink")}
        onPress={() => router.navigate("/sign-in")}
        testID="sign-up-signin"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  fields: { gap: spacing.md },
});
