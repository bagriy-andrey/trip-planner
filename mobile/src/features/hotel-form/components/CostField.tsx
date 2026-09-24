import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, TextField } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";

export interface CostFieldProps {
  amount: string;
  /** Chosen ISO code, or "" while none is chosen (never defaulted). */
  currency: string;
  onChangeAmount: (text: string) => void;
  /** Opens the currency bottom sheet (rendered by the screen, above everything). */
  onOpenCurrency: () => void;
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
  amountError,
  currencyError,
  testID,
}: CostFieldProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  const chosen = currency !== "";
  const text = chosen ? currency : t("form.field.currencyPlaceholder");
  return (
    <View testID={testID} style={styles.row}>
      <TextField
        style={styles.amount}
        label={t("form.field.cost")}
        placeholder={t("form.field.costAmountPlaceholder")}
        value={amount}
        onChangeText={onChangeAmount}
        errorText={amountError}
        variant="decimal"
        mono
        testID={`${testID}-amount`}
      />
      <View style={styles.currency}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.currency")}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("form.a11y.currencyField", { value: text })}
          onPress={onOpenCurrency}
          testID={`${testID}-currency`}
          style={[
            styles.button,
            { backgroundColor: tokens.surface, borderColor: currencyError === undefined ? tokens.surfaceBorder : tokens.danger },
          ]}
        >
          <AppText variant={chosen ? "mono" : "body"} color={chosen ? "text" : "textSecondary"} style={styles.buttonText}>
            {text}
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
