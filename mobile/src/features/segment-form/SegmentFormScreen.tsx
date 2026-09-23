import { firstSegmentPrefill } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AppText,
  EmptyState,
  Icon,
  IconButton,
  ModalHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/components";
import { useSegmentQuery, useSegmentsQuery } from "@/features/transport";
import { useTripQuery } from "@/features/trips";
import type { TripErrorKind } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

import { AirportField } from "./components/AirportField";
import { AirportSuggestions } from "./components/AirportSuggestions";
import { ArrivalBlock } from "./components/ArrivalBlock";
import { BaggageToggle } from "./components/BaggageToggle";
import { DepartureBlock } from "./components/DepartureBlock";
import { FlightNumberField } from "./components/FlightNumberField";
import { PassengerStepper } from "./components/PassengerStepper";
import { EMPTY_SEGMENT_FORM, segmentFormFromFirstPrefill, segmentFormFromSegment } from "./hooks/formState";
import type { SegmentFormState } from "./hooks/formState";
import { useSegmentForm } from "./hooks/useSegmentForm";
import type { SegmentFormTarget } from "./hooks/useSegmentForm";

export interface SegmentFormScreenProps {
  tripId: string;
  /** Missing = create (S9); present = edit (S9b) — ONE screen, ONE schema (AC-77). */
  segmentId?: string;
}

/** S9 / S9b — the segment (flight) form. */
export function SegmentFormScreen({ tripId, segmentId }: SegmentFormScreenProps) {
  return segmentId === undefined ? (
    <CreateSegmentLoader tripId={tripId} />
  ) : (
    <EditSegmentLoader tripId={tripId} segmentId={segmentId} />
  );
}

/**
 * Create mode needs the trip (for the first-segment prefill, AC-38) and the existing segments
 * (prefill only applies when there are none yet) before the form can render.
 */
function CreateSegmentLoader({ tripId }: { tripId: string }) {
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const router = useRouter();
  const tripQuery = useTripQuery(tripId);
  const segmentsQuery = useSegmentsQuery(tripId);

  if (tripQuery.isError && tripQuery.error?.kind === "notFound") {
    return <SegmentNotFound onBack={() => router.back()} />;
  }

  if (tripQuery.trip === undefined || segmentsQuery.segments === undefined) {
    const error = tripQuery.error ?? segmentsQuery.error;
    if (tripQuery.isError || segmentsQuery.isError) {
      return (
        <LoadErrorScreen
          kind={error?.kind ?? null}
          onRetry={() => {
            void tripQuery.refetch();
            void segmentsQuery.refetch();
          }}
        />
      );
    }
    return <LoadingScreen />;
  }

  const initial: SegmentFormState =
    segmentsQuery.segments.length === 0
      ? segmentFormFromFirstPrefill(firstSegmentPrefill(tripQuery.trip), lang)
      : EMPTY_SEGMENT_FORM;

  return <SegmentFormBody key="create" target={{ mode: "create", tripId }} initial={initial} />;
}

/** Edit mode: one segment by id, scoped to the trip; four bad-id cases all read "not found"
 * (AC-80/81) — same convention as S7/S8b's "trip not found". */
function EditSegmentLoader({ tripId, segmentId }: { tripId: string; segmentId: string }) {
  const { i18n } = useTranslation();
  const lang = resolveLocale([i18n.language]);
  const router = useRouter();
  const segmentQuery = useSegmentQuery(tripId, segmentId);

  if (segmentQuery.segment !== undefined) {
    return (
      <SegmentFormBody
        key={segmentQuery.segment.id}
        target={{ mode: "edit", tripId, segmentId }}
        initial={segmentFormFromSegment(segmentQuery.segment, lang)}
      />
    );
  }

  if (segmentQuery.isError && segmentQuery.error?.kind === "notFound") {
    return <SegmentNotFound onBack={() => router.back()} />;
  }
  if (segmentQuery.isError) {
    return (
      <LoadErrorScreen kind={segmentQuery.error?.kind ?? null} onRetry={() => void segmentQuery.refetch()} />
    );
  }
  return <LoadingScreen />;
}

interface SegmentFormBodyProps {
  target: SegmentFormTarget;
  initial: SegmentFormState;
}

function SegmentFormBody({ target, initial }: SegmentFormBodyProps) {
  const { t } = useTranslation("transport");
  const { t: tCommon } = useTranslation("common");
  const { t: tBookingForm } = useTranslation("bookingForm");
  const { t: tTrips } = useTranslation("trips");
  const { tokens } = useTheme();
  const today = useToday();
  const form = useSegmentForm(target, initial);

  const submitMessage = form.submitError ?? undefined;
  useEffect(() => {
    if (submitMessage) AccessibilityInfo.announceForAccessibility(submitMessage);
  }, [submitMessage]);

  const fieldError = (key: string): string | undefined => {
    const id = form.errors[key];
    return id === undefined ? undefined : t(`form.validation.${id}`);
  };

  return (
    <Screen testID="segment-form-screen" contentStyle={styles.content}>
      <ModalHeader
        title={tBookingForm("titles.flight")}
        cancelLabel={tCommon("actions.cancel")}
        onCancel={form.requestClose}
        cancelAsIcon
        hideDone
      />
      <View style={styles.fields}>
        <FlightNumberField
          label={t("field.flightNumber")}
          value={form.state.flightNumber}
          onChangeText={form.changeFlightNumber}
          carrier={form.carrier}
          recognizedText={(name) => t("carrier.fromDirectoryOffline", { name })}
          unrecognizedText={t("carrier.unrecognized")}
          errorText={fieldError("flightNumber")}
          placeholder={t("field.flightNumberPlaceholder")}
          hint={t("caption.flightNumber")}
          formatInvalid={form.flightNumberInvalid}
          formatInvalidText={t("form.validation.flightNumber.format")}
          testID="segment-form-flight-number"
        />
        <View style={styles.airport}>
          <AirportField
            label={t("field.from")}
            placeholder={t("field.from")}
            value={form.state.fromText}
            onChangeText={form.changeFrom}
            onClear={form.clearFrom}
            clearLabel={tTrips("form.a11y.clearDestination")}
            selected={form.state.fromAirport !== null}
            notInDirectoryText={t("caption.airportFromDirectory")}
            errorText={fieldError("fromAirport")}
            testID="segment-form-from"
          />
          {form.fromSuggestions !== null && form.fromSuggestions.length > 0 ? (
            <AirportSuggestions
              airports={form.fromSuggestions}
              lang={form.lang}
              onSelect={form.selectFromAirport}
              testID="segment-form-from-suggestions"
            />
          ) : null}
        </View>
        <View style={styles.airport}>
          <AirportField
            label={t("field.to")}
            placeholder={t("field.to")}
            value={form.state.toText}
            onChangeText={form.changeTo}
            onClear={form.clearTo}
            clearLabel={tTrips("form.a11y.clearDestination")}
            selected={form.state.toAirport !== null}
            notInDirectoryText={t("caption.airportFromDirectory")}
            errorText={fieldError("to")}
            testID="segment-form-to"
          />
          {form.toSuggestions !== null && form.toSuggestions.length > 0 ? (
            <AirportSuggestions
              airports={form.toSuggestions}
              lang={form.lang}
              onSelect={form.selectToAirport}
              testID="segment-form-to-suggestions"
            />
          ) : null}
        </View>
        <DepartureBlock
          dateLabel={t("field.departureDate")}
          timeLabel={t("field.departureTime")}
          date={form.state.departureDate}
          time={form.state.departureTime}
          onChangeDate={form.changeDepartureDate}
          onChangeTime={form.changeDepartureTime}
          dateFallback={today}
          errorText={
            (form.departureRuleError === undefined ? undefined : t(`form.validation.${form.departureRuleError}`)) ??
            fieldError("departureDate") ??
            fieldError("departureTime")
          }
          testID="segment-form-departure"
        />
        <ArrivalBlock
          dateLabel={t("field.arrivalDate")}
          timeLabel={t("field.arrivalTime")}
          caption={t("caption.arrivalOptional")}
          date={form.state.arrivalDate}
          time={form.state.arrivalTime}
          onChangeDate={form.changeArrivalDate}
          onChangeTime={form.changeArrivalTime}
          dateFallback={form.state.departureDate ?? today}
          errorText={fieldError("arrival")}
          testID="segment-form-arrival"
        />
        <BaggageToggle
          label={t("field.baggageIncluded")}
          value={form.state.baggageIncluded}
          onChange={form.changeBaggage}
          testID="segment-form-baggage"
        />
        <PassengerStepper
          label={t("field.passengers")}
          value={form.state.passengers}
          decrementAccessibilityLabel={tBookingForm("a11y.decreasePassengers")}
          incrementAccessibilityLabel={tBookingForm("a11y.increasePassengers")}
          onDecrement={form.decrementPassengers}
          onIncrement={form.incrementPassengers}
          testID="segment-form-passengers"
        />
        <MonoField
          label={t(form.state.passengers > 1 ? "field.seatMany" : "field.seat")}
          caption={form.state.passengers > 1 ? t("caption.perPassenger") : undefined}
          value={form.state.seat}
          onChangeText={form.changeSeat}
          errorText={fieldError("seat")}
          testID="segment-form-seat"
        />
        <MonoField
          label={t(form.state.passengers > 1 ? "field.ticketNumberMany" : "field.ticketNumber")}
          caption={form.state.passengers > 1 ? t("caption.perPassenger") : undefined}
          value={form.state.ticketNumber}
          onChangeText={form.changeTicketNumber}
          errorText={fieldError("ticketNumber")}
          testID="segment-form-ticket"
        />
      </View>
      {submitMessage === undefined ? null : (
        <AppText color="danger" accessibilityRole="alert" testID="segment-form-error">
          {submitMessage}
        </AppText>
      )}
      <PrimaryButton
        label={t("form.save")}
        accessibilityLabel={t("form.save")}
        disabled={!form.canSubmit}
        loading={form.submitting}
        onPress={form.done}
        testID="segment-form-save"
      />
      {form.isEdit ? null : (
        <SecondaryButton
          label={t("form.saveAndNext")}
          accessibilityLabel={t("form.saveAndNext")}
          disabled={!form.canSubmit || form.submitting}
          onPress={form.saveAndNext}
          testID="segment-form-save-next"
        />
      )}
      {form.canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("segment.delete")}
          onPress={form.askDelete}
          testID="segment-form-delete"
          style={styles.delete}
        >
          <AppText color="danger">{t("segment.delete")}</AppText>
        </Pressable>
      ) : null}

      {form.closeConfirmOpen ? (
        <ConfirmOverlay closeLabel={tCommon("actions.cancel")} onClose={form.cancelCloseConfirm} testID="segment-form-unsaved">
          <AppText variant="h2" accessibilityRole="header">
            {t("form.unsaved.title")}
          </AppText>
          <AppText color="textSecondary">{t("form.unsaved.message")}</AppText>
          <PrimaryButton
            label={t("form.unsaved.discard")}
            accessibilityLabel={t("form.unsaved.discard")}
            onPress={form.confirmDiscard}
            testID="segment-form-unsaved-discard"
          />
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={form.cancelCloseConfirm}
            testID="segment-form-unsaved-cancel"
          />
        </ConfirmOverlay>
      ) : null}

      {form.deleteSheet === "confirm" ? (
        <ConfirmOverlay closeLabel={tCommon("actions.cancel")} onClose={form.cancelDelete} testID="segment-form-delete-confirm">
          <AppText variant="h2" accessibilityRole="header">
            {t("segment.delete")}
          </AppText>
          <AppText color="textSecondary">{t("form.deleteConfirmMessage")}</AppText>
          {form.deleteError === null ? null : (
            <AppText color="danger" accessibilityRole="alert" testID="segment-form-delete-error">
              {form.deleteError}
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("segment.delete")}
            accessibilityState={{ busy: form.deleteBusy }}
            onPress={form.deleteBusy ? undefined : form.confirmDelete}
            testID="segment-form-delete-confirm-button"
            style={[styles.confirmDelete, { backgroundColor: tokens.surface, borderColor: tokens.danger }]}
          >
            {form.deleteBusy ? <ActivityIndicator color={tokens.danger} testID="segment-form-delete-spinner" /> : null}
            <AppText variant="button" color="danger" style={styles.confirmDeleteLabel}>
              {t("segment.delete")}
            </AppText>
          </Pressable>
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={form.cancelDelete}
            testID="segment-form-delete-cancel"
          />
        </ConfirmOverlay>
      ) : null}
    </Screen>
  );
}

interface MonoFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  errorText?: string;
  caption?: string;
  testID?: string;
}

/** Seat / ticket number: mono "ticket data" (AGENTS.md) — `TextField` has no mono variant, so this
 * screen (which owns both fields, neither has its own component in the step's file list) renders
 * them directly. */
function MonoField({ label, value, onChangeText, errorText, caption, testID }: MonoFieldProps) {
  const { tokens } = useTheme();
  const hasError = errorText !== undefined && errorText !== "";
  return (
    <View style={styles.wrapper}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel={hasError ? `${label}, ${errorText}` : label}
        testID={testID}
        style={[
          styles.monoInput,
          typography.mono,
          { color: tokens.text, backgroundColor: tokens.surface, borderColor: hasError ? tokens.danger : tokens.surfaceBorder },
        ]}
      />
      {hasError ? (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : caption === undefined ? null : (
        <AppText variant="small" color="textSecondary">
          {caption}
        </AppText>
      )}
    </View>
  );
}

interface ConfirmOverlayProps {
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * The SheetOverlay pattern (`features/trip-detail/components/SheetOverlay.tsx`, private to that
 * feature): a plain absolute view with a `scrim` backdrop, deliberately NOT a native `Modal` and
 * not a system `Alert` (AC-78). Reimplemented locally rather than reached into another feature's
 * internals (only a feature's own public `index.ts` is legal to import across features).
 */
function ConfirmOverlay({ closeLabel, onClose, children, testID }: ConfirmOverlayProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.overlayRoot]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.scrim }]}
      />
      <View
        style={[
          styles.overlayPanel,
          { backgroundColor: tokens.bg, borderColor: tokens.surfaceBorder, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function StateScreen({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const { t: tCommon } = useTranslation("common");
  return (
    <Screen testID="segment-form-screen" contentStyle={styles.content}>
      <View style={styles.topRow}>
        <IconButton accessibilityLabel={tCommon("actions.back")} onPress={onBack} testID="segment-form-state-back">
          <Icon name="back" />
        </IconButton>
      </View>
      {children}
    </Screen>
  );
}

function LoadingScreen() {
  const { t } = useTranslation("trips");
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <StateScreen onBack={() => router.back()}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("list.a11y.loading")}
        accessibilityState={{ busy: true }}
        testID="segment-form-loading"
        style={styles.centered}
      >
        <ActivityIndicator color={tokens.accent} />
      </View>
    </StateScreen>
  );
}

function LoadErrorScreen({ kind, onRetry }: { kind: TripErrorKind | null; onRetry: () => void }) {
  const { t } = useTranslation("tripDetail");
  const { t: tTrips } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const message = tTrips(`errors.${kind === null || kind === "notFound" ? "unknown" : kind}`);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <StateScreen onBack={() => router.back()}>
      <View testID="segment-form-load-error">
        <EmptyState
          title={t("loadError")}
          description={message}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={onRetry}
              testID="segment-form-retry-load"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

function SegmentNotFound({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation("transport");
  const { t: tCommon } = useTranslation("common");
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("segment.notFound"));
  }, [t]);
  return (
    <StateScreen onBack={onBack}>
      <View testID="segment-form-not-found">
        <EmptyState
          title={t("segment.notFound")}
          action={
            <SecondaryButton
              label={tCommon("actions.back")}
              accessibilityLabel={tCommon("actions.back")}
              onPress={onBack}
              testID="segment-form-not-found-back"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  fields: { gap: spacing.block },
  airport: { gap: spacing.sm },
  wrapper: { gap: spacing.xs },
  monoInput: {
    minHeight: layout.minTouch,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  delete: { minHeight: layout.minTouch, alignItems: "center", justifyContent: "center" },
  overlayRoot: { justifyContent: "flex-end" },
  overlayPanel: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: layout.borderWidth,
  },
  confirmDelete: {
    minHeight: layout.minTouch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  confirmDeleteLabel: { flexShrink: 1, textAlign: "center" },
  topRow: { flexDirection: "row", alignItems: "center" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
