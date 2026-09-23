import type { AirportRecord, PlaceLanguage } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, PressableRow } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface AirportSuggestionsProps {
  /** At most `AIRPORT_SUGGESTION_LIMIT` (4) matches from `searchAirports` (AC-16, AC-17). */
  airports: readonly AirportRecord[];
  lang: PlaceLanguage;
  onSelect: (airport: AirportRecord) => void;
  testID?: string;
}

/**
 * The drop-down under an airport field: name in `lang` (body face, not mono) and the IATA code in
 * mono on the right — mirrors `trip-form`'s `PlaceSuggestions` row shape. Every row is a full
 * `layout.minTouch` tall (AC-90) and its accessible name combines the name and the code directly
 * (no extra locale key needed: both are directory DATA, not source-literal text).
 */
export function AirportSuggestions({ airports, lang, onSelect, testID }: AirportSuggestionsProps) {
  const { tokens } = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.list, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
    >
      {airports.map((airport, index) => {
        const name = airport[lang];
        return (
          <PressableRow
            key={airport.id}
            accessibilityLabel={`${name}, ${airport.iata}`}
            onPress={() => onSelect(airport)}
            testID={`airport-suggestion-${airport.id}`}
            style={[
              styles.row,
              index > 0 && { borderTopColor: tokens.divider, borderTopWidth: layout.borderWidth },
            ]}
          >
            <AppText style={styles.name} numberOfLines={1} testID={`airport-suggestion-${airport.id}-name`}>
              {name}
            </AppText>
            <AppText variant="monoSmall" color="textSecondary" testID={`airport-suggestion-${airport.id}-code`}>
              {airport.iata}
            </AppText>
          </PressableRow>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    overflow: "hidden",
  },
  row: {
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: "space-between",
  },
  name: { flex: 1 },
});
