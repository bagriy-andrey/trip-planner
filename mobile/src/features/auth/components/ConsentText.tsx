import { StyleSheet } from "react-native";

import { AppText } from "@/components";
import { useTranslation } from "@/lib/i18n";

export interface ConsentTextProps {
  onTermsPress: () => void;
  onPrivacyPress: () => void;
}

/**
 * Consent line composed from nested text parts so the two document names stay
 * individually tappable inside one wrapping paragraph.
 */
export function ConsentText({ onTermsPress, onPrivacyPress }: ConsentTextProps) {
  const { t } = useTranslation("auth");
  return (
    <AppText variant="caption" color="textMuted" style={styles.centered}>
      {t("signUp.consentPrefix")}{" "}
      <AppText
        variant="caption"
        color="accent"
        accessibilityRole="link"
        accessibilityLabel={t("signUp.termsLink")}
        onPress={onTermsPress}
        testID="consent-terms"
      >
        {t("signUp.termsLink")}
      </AppText>{" "}
      {t("signUp.consentJoiner")}{" "}
      <AppText
        variant="caption"
        color="accent"
        accessibilityRole="link"
        accessibilityLabel={t("signUp.privacyLink")}
        onPress={onPrivacyPress}
        testID="consent-privacy"
      >
        {t("signUp.privacyLink")}
      </AppText>
    </AppText>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
});
