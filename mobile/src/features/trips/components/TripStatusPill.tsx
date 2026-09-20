import { Pill } from "@/components";
import type { PillTone } from "@/components";
import { formatRelativeDays, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

import type { TripStatusKind } from "../types";

export interface TripStatusPillProps {
  status: TripStatusKind;
  start: Date | null;
  locale: Locale;
  /** Reference "now" for the relative label; injected so output is deterministic. */
  now: Date;
}

const TONE: Record<TripStatusKind, PillTone> = {
  upcoming: "accent",
  planned: "neutral",
  draft: "neutral",
  completed: "muted",
};

/** Localized status text: relative days, "plan · no date yet" or "completed". */
export function useTripStatusLabel({ status, start, locale, now }: TripStatusPillProps): string {
  const { t } = useTranslation("common");
  if (status === "completed") return t("status.completed");
  if (status === "draft" || start === null) return t("status.draft");
  return formatRelativeDays(locale, start, now);
}

/** Status chip of a trip card. */
export function TripStatusPill(props: TripStatusPillProps) {
  const label = useTripStatusLabel(props);
  return <Pill tone={TONE[props.status]} label={label} />;
}
