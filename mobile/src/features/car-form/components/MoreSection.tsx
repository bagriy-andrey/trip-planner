import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, MoneyField, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

import type { CarFormController } from "../hooks/useCarForm";
import { SwitchRow } from "./SwitchRow";
import { useErrorText } from "./useErrorText";

/** "More" (collapsed unless it already holds something, AC-14): extra driver, card deposit, notes. */
export function MoreSection({ form, initialOpen }: { form: CarFormController; initialOpen: boolean }) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const [open, setOpen] = useState(initialOpen);
  const { state, errors } = form;
  const depositLabel =
    state.costCurrency === ""
      ? t("form.field.deposit")
      : t("form.field.depositWithCurrency", { currency: state.costCurrency });

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("form.a11y.moreToggle")}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        testID="car-form-more-toggle"
        style={styles.header}
      >
        <View style={styles.titles}>
          <AppText variant="h2" accessibilityRole="header">
            {t("form.groups.more")}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {t("form.groups.moreCaption")}
          </AppText>
        </View>
        <View testID="car-form-more-chevron" style={open ? styles.flipped : undefined}>
          <Icon name="chevronDown" color="textSecondary" />
        </View>
      </Pressable>
      {open ? (
        <>
          <SwitchRow
            label={t("form.field.extraDriver")}
            value={state.extraDriver}
            onChange={(extraDriver) => form.apply({ extraDriver })}
            testID="car-form-extra-driver"
          />
          <MoneyField
            label={depositLabel}
            placeholder={t("form.field.costAmountPlaceholder")}
            value={state.depositAmount}
            onChangeText={(depositAmount) => form.apply({ depositAmount })}
            onBlur={() => form.touch("cost")}
            errorText={text(errors.depositAmount)}
            mono={false}
            testID="car-form-deposit"
          />
          <TextField
            label={t("form.field.notes")}
            value={state.notes}
            onChangeText={(notes) => form.apply({ notes })}
            onBlur={() => form.touch("notes")}
            errorText={text(errors.notes)}
            multiline
            testID="car-form-notes"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
  header: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titles: { flex: 1 },
  flipped: { transform: [{ rotate: "180deg" }] },
});
