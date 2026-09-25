import type { ReactNode } from "react";
import { useEffect } from "react";
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from "react-native";

import { EmptyState, Icon, IconButton, Screen, SecondaryButton } from "@/components";
import { CarNotFound } from "@/features/cars";
import type { TripErrorKind } from "@/features/trips";
import { useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

function StateScreen({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const { t } = useTranslation("common");
  return (
    <Screen testID="car-form-screen" contentStyle={styles.content}>
      <View style={styles.topRow}>
        <IconButton accessibilityLabel={t("actions.back")} onPress={onBack} testID="car-form-state-back">
          <Icon name="back" />
        </IconButton>
      </View>
      {children}
    </Screen>
  );
}

export function CarFormLoading({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("trips");
  const { tokens } = useTheme();
  return (
    <StateScreen onBack={onBack}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("list.a11y.loading")}
        accessibilityState={{ busy: true }}
        testID="car-form-loading"
        style={styles.centered}
      >
        <ActivityIndicator color={tokens.accent} />
      </View>
    </StateScreen>
  );
}

export function CarFormLoadError({
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
      <View testID="car-form-load-error">
        <EmptyState
          title={t("loadError")}
          description={message}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={onRetry}
              testID="car-form-retry-load"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

/** The shared "Rental not found" state (AC-32) inside the form's own screen shell. */
export function CarFormNotFound({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("car");
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("notFound.title"));
  }, [t]);
  return (
    <StateScreen onBack={onBack}>
      <View testID="car-form-not-found">
        <CarNotFound onBack={onBack} />
      </View>
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
