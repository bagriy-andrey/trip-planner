import { AppText } from "@/components";
import { useTranslation } from "@/lib/i18n";

import type { TripErrorKind } from "../api";

export interface ProfileSaveErrorProps {
  kind: TripErrorKind;
  testID: string;
}

/** Save failure under its card: inline, announced, never a system alert. */
export function ProfileSaveError({ kind, testID }: ProfileSaveErrorProps) {
  const { t } = useTranslation("trips");
  return (
    <AppText variant="small" color="danger" accessibilityRole="alert" testID={testID}>
      {t(kind === "notFound" ? "errors.unknown" : `errors.${kind}`)}
    </AppText>
  );
}
