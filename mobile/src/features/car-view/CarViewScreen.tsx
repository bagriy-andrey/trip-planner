import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { ConfirmOverlay, EmptyState, PrimaryButton, Screen, SecondaryButton } from "@/components";
import { CarNotFound, useCarQuery } from "@/features/cars";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

import { CarViewHeader } from "./components/CarViewHeader";
import { ChainCard } from "./components/ChainCard";
import { MainCard } from "./components/MainCard";
import { NotesCard } from "./components/NotesCard";
import { OfficeCard } from "./components/OfficeCard";
import { TermsCard } from "./components/TermsCard";

export interface CarViewScreenProps {
  tripId: string;
  carId: string;
}

/** S17: the rental booking as read at the desk. Shows cached data even if a refetch failed (AC-49a). */
export function CarViewScreen({ tripId, carId }: CarViewScreenProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation("car");
  const { t: tCommon } = useTranslation("common");
  const { t: tTrips } = useTranslation("trips");
  const { t: tDetail } = useTranslation("tripDetail");
  const { tokens } = useTheme();
  const query = useCarQuery(tripId, carId);
  const locale = resolveLocale([i18n.language]);

  const [menuOpen, setMenuOpen] = useState(false);
  const onBack = () => router.back();
  const onEdit = () => {
    setMenuOpen(false);
    router.push({ pathname: "/trips/[tripId]/cars/[carId]", params: { tripId, carId } });
  };
  const car: Car | undefined = query.car;

  let body;
  if (car !== undefined) {
    body = (
      <ScrollView contentContainerStyle={styles.body} testID="car-view-body">
        <MainCard car={car} />
        <ChainCard car={car} locale={locale} />
        <OfficeCard car={car} />
        <TermsCard car={car} locale={locale} />
        {car.notes === null ? null : <NotesCard notes={car.notes} />}
      </ScrollView>
    );
  } else if (query.isError && query.error?.kind === "notFound") {
    body = (
      <View testID="car-view-not-found">
        <CarNotFound onBack={onBack} />
      </View>
    );
  } else if (query.isError) {
    const kind = query.error?.kind ?? "unknown";
    const messageKind = kind === "notFound" ? "unknown" : kind;
    body = (
      <View testID="car-view-load-error">
        <EmptyState
          title={tDetail("loadError")}
          description={tTrips(`errors.${messageKind}`)}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={() => void query.refetch()}
              testID="car-view-retry"
            />
          }
        />
      </View>
    );
  } else {
    body = (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={tTrips("list.a11y.loading")}
        accessibilityState={{ busy: true }}
        testID="car-view-loading"
        style={styles.centered}
      >
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll={false} testID="car-view-screen" contentStyle={styles.content}>
        <CarViewHeader onBack={onBack} onMore={car === undefined ? undefined : () => setMenuOpen(true)} />
        {body}
      </Screen>
      {menuOpen ? (
        <ConfirmOverlay closeLabel={tCommon("actions.cancel")} onClose={() => setMenuOpen(false)} testID="car-view-menu">
          <PrimaryButton
            label={t("view.edit")}
            accessibilityLabel={t("view.edit")}
            onPress={onEdit}
            testID="car-view-edit"
          />
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={() => setMenuOpen(false)}
            testID="car-view-menu-cancel"
          />
        </ConfirmOverlay>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.md },
  body: { gap: spacing.gap, paddingBottom: spacing.xl },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
