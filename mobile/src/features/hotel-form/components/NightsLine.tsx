import { AppText } from "@/components";
import { useTranslation } from "@/lib/i18n";

export interface NightsLineProps {
  /** Nights from the hook (computed by `shared`); this component never calculates. */
  nights: number | null;
  testID?: string;
}

/** "N ночей — считается из дат" (AC-21): hidden while a date is missing or the stay is 0 nights. */
export function NightsLine({ nights, testID }: NightsLineProps) {
  const { t } = useTranslation("hotel");
  if (nights === null || nights <= 0) return null;
  return (
    <AppText color="textSecondary" testID={testID}>
      {t("form.nights", { count: nights })}
    </AppText>
  );
}
