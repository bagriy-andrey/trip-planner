import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ModalHeader, PlaceholderField, PrimaryButton, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { BaggageToggle } from "./components/BaggageToggle";
import { PassengerStepper } from "./components/PassengerStepper";
import { BOOKING_FORMS } from "./fields";
import type { BookingVariant } from "./fields";

export interface BookingFormScreenProps {
  variant: BookingVariant;
}

/**
 * S9 — booking form (modal stub) for a flight, hotel or car. One shell; the
 * field set comes from `fields.ts`. Nothing is validated or saved and every
 * button just closes the modal (AC-12).
 */
export function BookingFormScreen({ variant }: BookingFormScreenProps) {
  const { t } = useTranslation("bookingForm");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const close = () => router.back();
  const spec = BOOKING_FORMS[variant];

  return (
    <Screen testID={`booking-form-${variant}`} contentStyle={styles.content}>
      <ModalHeader title={t(spec.titleKey)} onCancel={close} onDone={close} />
      <View style={styles.fields}>
        {spec.fields.map((field) => {
          const label = t(field.labelKey);
          switch (field.kind) {
            case "text":
              return <PlaceholderField key={field.id} label={label} mono={field.mono} />;
            case "toggle":
              return <BaggageToggle key={field.id} label={label} />;
            case "stepper":
              return <PassengerStepper key={field.id} label={label} value={field.value} testID="passenger-stepper" />;
          }
        })}
      </View>
      <PrimaryButton
        label={tCommon("actions.save")}
        accessibilityLabel={tCommon("actions.save")}
        onPress={close}
        testID="booking-form-save"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  fields: { gap: spacing.md },
});
