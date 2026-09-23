import { StyleSheet, View } from "react-native";
import type { Hotel } from "@tripplanner/shared";

import type { Locale } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { HotelCard } from "./HotelCard";

export interface HotelBlockProps {
  hotels: readonly Hotel[];
  locale: Locale;
  /** A card was tapped; reports the hotel id (opens the edit form). */
  onHotelPress: (hotelId: string) => void;
  testID?: string;
}

/** Cards by check-in ascending; equal check-ins fall back to id so the order is deterministic. */
function byCheckIn(a: Hotel, b: Hotel): number {
  return a.checkInAt.getTime() - b.checkInAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * S7's "Отель" block CONTENT. The section chrome (title, "+") and the empty/non-empty decision
 * belong to S7, not to this block.
 */
export function HotelBlock({ hotels, locale, onHotelPress, testID }: HotelBlockProps) {
  return (
    <View testID={testID} style={styles.root}>
      {[...hotels].sort(byCheckIn).map((hotel) => (
        <HotelCard
          key={hotel.id}
          hotel={hotel}
          locale={locale}
          onPress={onHotelPress}
          testID={testID === undefined ? undefined : `${testID}-hotel-${hotel.id}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: spacing.md } });
