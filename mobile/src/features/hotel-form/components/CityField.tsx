import type { CityRecord, PlaceLanguage } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, Icon, PressableRow, TextField } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface CityFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  /** At most 4 directory cities; empty = no list. */
  suggestions: readonly CityRecord[];
  lang: PlaceLanguage;
  onSelect: (city: CityRecord) => void;
  /** Already translated schema error (required / not in directory). */
  errorText?: string;
  testID?: string;
}

/**
 * "Город": free text whose only valid VALUE is a picked directory city (AC-12). Typing drops the pick
 * (done by the caller), so text the user never tapped a suggestion for is never treated as filled.
 * Same shape as trip-form's PlaceField, re-implemented here (feature internals are not imported).
 */
export function CityField({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  suggestions,
  lang,
  onSelect,
  errorText,
  testID,
}: CityFieldProps) {
  const { tokens } = useTheme();
  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        errorText={errorText}
        autoCorrect={false}
        testID={testID}
      />
      {suggestions.length > 0 ? (
        <View
          testID={testID === undefined ? undefined : `${testID}-suggestions`}
          style={[styles.list, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
        >
          {suggestions.map((city, index) => (
            <PressableRow
              key={city.id}
              accessibilityLabel={city[lang]}
              onPress={() => onSelect(city)}
              testID={`city-suggestion-${city.id}`}
              style={[
                styles.row,
                index > 0 && { borderTopColor: tokens.divider, borderTopWidth: layout.borderWidth },
              ]}
            >
              <Icon name="pin" color="textSecondary" />
              <AppText numberOfLines={1} style={styles.name}>
                {city[lang]}
              </AppText>
            </PressableRow>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  list: { borderRadius: radius.field, borderWidth: layout.borderWidth, overflow: "hidden" },
  row: { minHeight: layout.minTouch, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  name: { flex: 1 },
});
