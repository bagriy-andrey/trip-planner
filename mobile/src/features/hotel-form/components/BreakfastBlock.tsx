import { HOTEL_BREAKFAST } from "@tripplanner/shared";
import type { HotelBreakfast } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, SegmentedControl, Stepper } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface BreakfastBlockProps {
  value: HotelBreakfast;
  days: number;
  /** From `breakfastDaysRange` (shared); the stepper only exists for "partial" (AC-22). */
  range: { min: number; max: number };
  onChange: (value: HotelBreakfast) => void;
  onStepDays: (delta: number) => void;
  testID: string;
}

/** "Завтраки" segments (Все дни / Частично / Нет) and, for "Частично", the "Дней с завтраком" stepper. */
export function BreakfastBlock({ value, days, range, onChange, onStepDays, testID }: BreakfastBlockProps) {
  const { t } = useTranslation("hotel");
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {t("form.field.breakfast")}
      </AppText>
      <SegmentedControl
        label={t("form.a11y.breakfastGroup")}
        options={HOTEL_BREAKFAST.map((option) => ({ value: option, label: t(`form.breakfast.${option}`) }))}
        value={value}
        onChange={onChange}
        testID={`${testID}-segments`}
      />
      {value === "partial" ? (
        <View style={styles.days}>
          <AppText variant="small" color="textSecondary">
            {t("form.field.breakfastDays")}
          </AppText>
          <Stepper
            value={days}
            min={range.min}
            max={range.max}
            accessibilityLabel={t("form.field.breakfastDays")}
            decrementAccessibilityLabel={t("form.a11y.decreaseBreakfastDays")}
            incrementAccessibilityLabel={t("form.a11y.increaseBreakfastDays")}
            onDecrement={() => onStepDays(-1)}
            onIncrement={() => onStepDays(1)}
            testID={`${testID}-days`}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  days: { gap: spacing.xs },
});
