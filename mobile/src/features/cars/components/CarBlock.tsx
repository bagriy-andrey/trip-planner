import { StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import type { Locale } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { CarCard } from "./CarCard";

export interface CarBlockProps {
  /** Already in api order (pickup date, pickup time, id); rendered as given. */
  cars: readonly Car[];
  locale: Locale;
  onCarPress: (carId: string) => void;
  testID?: string;
}

/** S7's "Аренда авто" block CONTENT; the section chrome and empty state belong to S7. */
export function CarBlock({ cars, locale, onCarPress, testID }: CarBlockProps) {
  return (
    <View testID={testID} style={styles.root}>
      {cars.map((car) => (
        <CarCard
          key={car.id}
          car={car}
          locale={locale}
          onPress={onCarPress}
          testID={testID === undefined ? undefined : `${testID}-car-${car.id}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ root: { gap: spacing.md } });
