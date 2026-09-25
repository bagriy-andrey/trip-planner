import { useTranslation } from "@/lib/i18n";

import type { DatesErrorId } from "../hooks/carErrors";

/** Error id (`shared` id or the mobile `pickup.inPast`) -> its `car:form.validation.<id>` text. */
export function useErrorText(): (id: DatesErrorId | undefined) => string | undefined {
  const { t } = useTranslation("car");
  return (id) => (id === undefined ? undefined : t(`form.validation.${id}`));
}
