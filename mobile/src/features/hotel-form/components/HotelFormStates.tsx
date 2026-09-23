import type { ReactNode } from "react";
import { useEffect } from "react";
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from "react-native";

import { EmptyState, Icon, IconButton, Screen, SecondaryButton } from "@/components";
import type { TripErrorKind } from "@/features/trips";
import { useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

function StateScreen({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const { t } = useTranslation("common");
  return (
    <Screen testID="hotel-form-screen" contentStyle={styles.content}>
      <View style={styles.topRow}>
        <IconButton accessibilityLabel={t("actions.back")} onPress={onBack} testID="hotel-form-state-back">
          <Icon name="back" />
        </IconButton>
      </View>
      {children}
    </Screen>
  );
}

export function HotelFormLoading({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("trips");
  const { tokens } = useTheme();
  return (
    <StateScreen onBack={onBack}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("list.a11y.loading")}
        accessibilityState={{ busy: true }}
        testID="hotel-form-loading"
        style={styles.centered}
      >
        <ActivityIndicator color={tokens.accent} />
      </View>
    </StateScreen>
  );
}

export function HotelFormLoadError({
  kind,
  onRetry,
  onBack,
}: {
  kind: TripErrorKind | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("tripDetail");
  const { t: tTrips } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const message = tTrips(`errors.${kind === null || kind === "notFound" ? "unknown" : kind}`);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <StateScreen onBack={onBack}>
      <View testID="hotel-form-load-error">
        <EmptyState
          title={t("loadError")}
          description={message}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={onRetry}
              testID="hotel-form-retry-load"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

/** One state for an unknown, foreign, malformed or already-deleted hotel id (AC-33). */
export function HotelNotFound({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("hotel");
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("notFound.title"));
  }, [t]);
  return (
    <StateScreen onBack={onBack}>
      <View testID="hotel-form-not-found">
        <EmptyState
          title={t("notFound.title")}
          description={t("notFound.text")}
          action={
            <SecondaryButton
              label={t("notFound.action")}
              accessibilityLabel={t("notFound.action")}
              onPress={onBack}
              testID="hotel-form-not-found-back"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
