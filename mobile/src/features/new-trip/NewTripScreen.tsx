import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ModalHeader, PlaceholderField, PrimaryButton, Screen } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

/** S8 — new trip (modal stub). Nothing is validated or saved; every button just closes it (AC-12). */
export function NewTripScreen() {
  const { t } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const close = () => router.back();

  return (
    <Screen testID="new-trip-screen" contentStyle={styles.content}>
      <ModalHeader title={t("newTrip.title")} onCancel={close} onDone={close} />
      <View style={styles.fields}>
        <PlaceholderField label={t("newTrip.city")} placeholder={t("newTrip.cityPlaceholder")} />
        <PlaceholderField label={t("newTrip.dates")} placeholder={t("newTrip.datesPlaceholder")} />
      </View>
      <PrimaryButton
        label={tCommon("actions.save")}
        accessibilityLabel={tCommon("actions.save")}
        onPress={close}
        testID="new-trip-save"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  fields: { gap: spacing.md },
});
