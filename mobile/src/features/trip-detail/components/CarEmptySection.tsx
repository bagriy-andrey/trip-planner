import { EmptyState, PrimaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";

export interface CarEmptySectionProps {
  onAdd: () => void;
  testID?: string;
}

/** The skeleton's single empty state: the reference layout for every future empty list. */
export function CarEmptySection({ onAdd, testID }: CarEmptySectionProps) {
  const { t } = useTranslation("tripDetail");
  return (
    <EmptyState
      title={t("car.emptyTitle")}
      description={t("car.emptyText")}
      action={
        <PrimaryButton
          label={t("car.addAction")}
          accessibilityLabel={t("car.addAction")}
          onPress={onAdd}
          testID={testID}
        />
      }
    />
  );
}
