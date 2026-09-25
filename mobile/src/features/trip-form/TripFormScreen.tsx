import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton, TextField } from "@/components";
import { useTripQuery } from "@/features/trips";
import { placeLanguageOf, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

import { DatesBlock } from "./components/DatesBlock";
import { FormHeader } from "./components/FormHeader";
import { PlaceField } from "./components/PlaceField";
import { PlaceSuggestions } from "./components/PlaceSuggestions";
import { EMPTY_TRIP_FORM, formStateFromTrip } from "./hooks/formState";
import type { TripFormState } from "./hooks/formState";
import { useTripForm } from "./hooks/useTripForm";
import type { TripFormMode } from "./hooks/useTripForm";

export type TripFormScreenProps = TripFormMode;

/** S8 (create) and S8b (edit): one form, one schema. Edit waits for the trip before showing it. */
export function TripFormScreen(props: TripFormScreenProps) {
  return props.mode === "create" ? (
    <TripFormBody target={props} initial={EMPTY_TRIP_FORM} />
  ) : (
    <EditTripLoader tripId={props.tripId} />
  );
}

/** Edit mode: loading and "trip not found" states around the form, prefilled once loaded. */
function EditTripLoader({ tripId }: { tripId: string }) {
  const { t, i18n } = useTranslation("trips");
  const { t: tDetail } = useTranslation("tripDetail");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const { tokens } = useTheme();
  const { trip, isError, error, refetch } = useTripQuery(tripId);

  if (trip !== undefined) {
    // Keyed by id: opening another trip in the same sheet starts from its own values.
    return (
      <TripFormBody
        key={trip.id}
        target={{ mode: "edit", tripId }}
        initial={formStateFromTrip(trip, placeLanguageOf(resolveLocale([i18n.language])))}
      />
    );
  }

  const header = (
    <FormHeader
      title={t("form.editTitle")}
      cancelLabel={tCommon("actions.cancel")}
      onCancel={() => router.back()}
    />
  );

  if (!isError) {
    return (
      <Screen testID="trip-form-screen" contentStyle={styles.content}>
        {header}
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t("list.a11y.loading")}
          accessibilityState={{ busy: true }}
          testID="trip-form-loading"
          style={styles.centered}
        >
          <ActivityIndicator color={tokens.accent} />
        </View>
      </Screen>
    );
  }

  // A trip that is gone, was never the user's or has a foreign id looks the same (AC-56).
  if (error?.kind === "notFound") {
    return (
      <Screen testID="trip-form-screen" contentStyle={styles.content}>
        {header}
        <View testID="trip-form-not-found">
          <EmptyState
            title={tDetail("notFound.title")}
            description={tDetail("notFound.text")}
            action={
              <SecondaryButton
                label={tDetail("notFound.action")}
                accessibilityLabel={tDetail("notFound.action")}
                onPress={() => router.back()}
                testID="trip-form-not-found-back"
              />
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="trip-form-screen" contentStyle={styles.content}>
      {header}
      <View testID="trip-form-load-error">
        <EmptyState
          title={tDetail("loadError")}
          description={t(`errors.${error?.kind === undefined ? "unknown" : error.kind}`)}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={() => void refetch()}
              testID="trip-form-retry-load"
            />
          }
        />
      </View>
    </Screen>
  );
}

interface TripFormBodyProps {
  target: TripFormMode;
  initial: TripFormState;
}

function TripFormBody({ target, initial }: TripFormBodyProps) {
  const { t } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const form = useTripForm(target, initial);
  const isCreate = target.mode === "create";
  const submitLabel = isCreate ? t("form.create") : t("form.save");

  const errorText = (id: string | undefined): string | undefined =>
    id === undefined ? undefined : t(`form.validation.${id as "destination.empty"}`);
  const submitMessage = form.submitError === null ? undefined : t(`errors.${form.submitError}`);

  // A failed save is spoken when it appears (AC-58); the message itself sits in the sheet.
  useEffect(() => {
    if (submitMessage) AccessibilityInfo.announceForAccessibility(submitMessage);
  }, [submitMessage]);

  return (
    <Screen testID="trip-form-screen" contentStyle={styles.content}>
      <FormHeader
        title={isCreate ? t("form.createTitle") : t("form.editTitle")}
        cancelLabel={tCommon("actions.cancel")}
        onCancel={form.cancel}
      />
      <View style={styles.fields}>
        <View style={styles.place}>
          <PlaceField
            label={t("form.destination.label")}
            placeholder={t("form.destination.placeholder")}
            value={form.state.destination}
            onChangeText={form.changeDestination}
            onClear={form.clearDestination}
            clearLabel={t("form.a11y.clearDestination")}
            selected={form.placeSelected}
            errorText={errorText(form.errors.destination)}
            autoFocus={isCreate}
            testID="trip-form-destination"
          />
          {form.suggestions === null ? null : (
            <PlaceSuggestions
              places={form.suggestions}
              lang={form.lang}
              onSelect={form.selectPlace}
              testID="trip-form-suggestions"
            />
          )}
        </View>
        <View style={styles.title}>
          <TextField
            label={t("form.title.label")}
            placeholder={t("form.title.placeholder")}
            value={form.state.title}
            onChangeText={form.changeTitle}
            errorText={errorText(form.errors.title)}
            testID="trip-form-title"
          />
          <AppText variant="small" color="textSecondary">
            {t("form.title.hint")}
          </AppText>
        </View>
        <DatesBlock
          startDate={form.state.startDate}
          endDate={form.state.endDate}
          noDates={form.state.noDates}
          onChangeRange={form.changeRange}
          onChangeNoDates={form.changeNoDates}
          startFallback={form.startFallback}
          errorText={errorText(form.errors.dates)}
          testID="trip-form-dates"
        />
      </View>
      {submitMessage === undefined ? null : (
        <AppText color="danger" accessibilityRole="alert" testID="trip-form-error">
          {submitMessage}
        </AppText>
      )}
      <PrimaryButton
        label={submitLabel}
        accessibilityLabel={form.submitting ? t("form.a11y.saving") : submitLabel}
        disabled={!form.canSubmit}
        loading={form.submitting}
        onPress={() => void form.submit()}
        testID="trip-form-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  fields: { gap: spacing.block },
  place: { gap: spacing.sm },
  title: { gap: spacing.xs },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
