import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, TextField } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";

import { filterMoneyInput } from "../hooks/moneyInput";

export interface CostFieldProps {
  amount: string;
  /** Chosen ISO code, or "" while none is chosen (never defaulted). */
  currency: string;
  onChangeAmount: (text: string) => void;
  /** Opens the currency bottom sheet (rendered by the screen, above everything). */
  onOpenCurrency: () => void;
  /** The amount field lost focus (the screen then reveals a missing currency). */
  onBlurAmount?: () => void;
  /** Hint shown while no currency is chosen: the home currency or the generic example (AC-40). Never a value. */
  currencyPlaceholder: string;
  amountError?: string;
  currencyError?: string;
  testID: string;
}

/** "Стоимость": amount (mono, ticket data) + a currency dropdown button that opens the picker sheet (AC-19). */
export function CostField({
  amount,
  currency,
  onChangeAmount,
  onOpenCurrency,
  onBlurAmount,
  currencyPlaceholder,
  amountError,
  currencyError,
  testID,
}: CostFieldProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  // A controlled native input keeps whatever the user typed unless React re-renders it with a
  // value: when the filter drops the char ("12" + "a" -> "12") the state does not change, React
  // bails out, and the native field would keep showing "12a". Bumping this forces the re-render
  // so the native text is overwritten. The overlaid display (`overlayValue`) means the rejected
  // character is never visible in the meantime.
  const [, forceRender] = useState(0);
  const handleChange = (raw: string) => {
    const filtered = filterMoneyInput(raw);
    if (filtered !== raw) forceRender((n) => n + 1);
    onChangeAmount(filtered);
  };
  const chosen = currency !== "";
  // The placeholder (EUR) is only a hint: never the value, never spoken as one.
  const required = !chosen && amount !== "";
  return (
    <View testID={testID} style={styles.row}>
      <TextField
        style={styles.amount}
        label={t("form.field.cost")}
        placeholder={t("form.field.costAmountPlaceholder")}
        value={amount}
        onChangeText={handleChange}
        errorText={amountError}
        onBlur={onBlurAmount}
        variant="decimal"
        mono
        overlayValue
        testID={`${testID}-amount`}
      />
      <View style={styles.currency}>
        <AppText variant="small" color="textSecondary">
          {required ? t("form.field.currencyRequired") : t("form.field.currency")}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("form.a11y.currencyField", { value: chosen ? currency : t("form.a11y.currencyEmpty") })}
          onPress={onOpenCurrency}
          testID={`${testID}-currency`}
          style={[
            styles.button,
            { backgroundColor: tokens.surface, borderColor: currencyError === undefined ? tokens.surfaceBorder : tokens.danger },
          ]}
        >
          <AppText variant="mono" color={chosen ? "text" : "textSecondary"} style={styles.buttonText}>
            {chosen ? currency : currencyPlaceholder}
          </AppText>
          <Icon name="chevron" color="textSecondary" />
        </Pressable>
        {currencyError === undefined ? null : (
          <AppText variant="small" color="danger" accessibilityRole="alert">
            {currencyError}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.gap, alignItems: "flex-start" },
  amount: { flex: 2 },
  currency: { flex: 2, gap: spacing.xs },
  button: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  buttonText: { flexShrink: 1 },
});
