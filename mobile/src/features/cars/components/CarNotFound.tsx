import { EmptyState, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";

export interface CarNotFoundProps {
  onBack: () => void;
}

/** The one "Rental not found" state shared by the edit form (S16b) and the view (S17), AC-32. */
export function CarNotFound({ onBack }: CarNotFoundProps) {
  const { t } = useTranslation("car");
  return (
    <EmptyState
      title={t("notFound.title")}
      description={t("notFound.text")}
      action={<SecondaryButton label={t("notFound.action")} accessibilityLabel={t("notFound.action")} onPress={onBack} />}
    />
  );
}
