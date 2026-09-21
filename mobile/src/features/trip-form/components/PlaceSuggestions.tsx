import { PLACE_DIRECTORY } from "@tripplanner/shared";
import type { PlaceLanguage, PlaceRecord } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, PressableRow } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface PlaceSuggestionsProps {
  /** At most four matches; an empty list renders the "nothing found" row (AC-14). */
  places: readonly PlaceRecord[];
  lang: PlaceLanguage;
  onSelect: (place: PlaceRecord) => void;
  testID?: string;
}

/** The country a city belongs to, in `lang`; the ISO code stands in for a country not in the directory. */
function countryNameOf(countryCode: string, lang: PlaceLanguage): string {
  const country = PLACE_DIRECTORY.find(
    (place) => place.kind === "country" && place.countryCode === countryCode,
  );
  return country === undefined ? countryCode : country[lang];
}

/**
 * The drop-down under the "where to" field. A row is the name (body face, NOT mono), under it
 * "City · Portugal" / "Country · Europe" in `textTertiary`, and — cities only — the airport code
 * in mono on the right (AC-34, AC-68).
 */
export function PlaceSuggestions({ places, lang, onSelect, testID }: PlaceSuggestionsProps) {
  const { t } = useTranslation("trips");
  const { tokens } = useTheme();

  const detailOf = (place: PlaceRecord): string =>
    place.kind === "city"
      ? t("form.suggestion.city", { detail: countryNameOf(place.countryCode, lang) })
      : t("form.suggestion.country", { detail: t(`form.regions.${place.region}`) });

  return (
    <View
      testID={testID}
      style={[styles.list, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
    >
      {places.length === 0 ? (
        <AppText color="textSecondary" style={styles.noMatch} testID="place-no-match">
          {t("form.destination.noMatch")}
        </AppText>
      ) : (
        places.map((place, index) => {
          const detail = detailOf(place);
          const name = place[lang];
          return (
            <PressableRow
              key={place.id}
              accessibilityLabel={t(
                place.kind === "city" ? "form.a11y.suggestionCity" : "form.a11y.suggestionCountry",
                { name, detail },
              )}
              onPress={() => onSelect(place)}
              testID={`place-suggestion-${place.id}`}
              style={[
                styles.row,
                index > 0 && { borderTopColor: tokens.divider, borderTopWidth: layout.borderWidth },
              ]}
            >
              <View style={styles.texts}>
                <AppText testID={`place-suggestion-${place.id}-name`} numberOfLines={1}>
                  {name}
                </AppText>
                <AppText
                  variant="small"
                  color="textTertiary"
                  testID={`place-suggestion-${place.id}-detail`}
                  numberOfLines={1}
                >
                  {detail}
                </AppText>
              </View>
              {place.kind === "city" && place.airportCode !== undefined ? (
                <AppText
                  variant="monoSmall"
                  color="textSecondary"
                  testID={`place-suggestion-${place.id}-code`}
                >
                  {place.airportCode}
                </AppText>
              ) : null}
            </PressableRow>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    overflow: "hidden",
  },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  texts: { flex: 1 },
  noMatch: { padding: spacing.lg },
});
