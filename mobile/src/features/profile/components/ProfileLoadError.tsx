import { StyleSheet, View } from "react-native";

import { AppText, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface ProfileLoadErrorProps {
  onRetry: () => void;
}

/** Shown instead of the "About me" rows when the profile could not be loaded (AC-28). */
export function ProfileLoadError({ onRetry }: ProfileLoadErrorProps) {
  const { t } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  return (
    <View style={styles.root} testID="profile-load-error">
      <AppText color="textSecondary" accessibilityRole="alert">
        {t("errors.unknown")}
      </AppText>
      <SecondaryButton label={tCommon("actions.retry")} accessibilityLabel={tCommon("actions.retry")} onPress={onRetry} testID="profile-retry" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: spacing.md, paddingVertical: spacing.sm } });
