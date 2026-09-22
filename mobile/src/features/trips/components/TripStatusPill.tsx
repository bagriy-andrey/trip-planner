import { daysBetween } from "@tripplanner/shared";
import type { CalendarDate } from "@tripplanner/shared";

import { Pill } from "@/components";
import type { PillTone } from "@/components";
import { useTranslation } from "@/lib/i18n";

import type { TripStatusKind } from "../types";

export interface TripStatusPillProps {
  status: TripStatusKind;
  startDate: CalendarDate | null;
  /** Reference "today" for the relative label; injected (`useToday()`) so output is deterministic. */
  today: CalendarDate;
  testID?: string;
}

// Only the nearest trip is loud (AC-23); everything else is `divider` + `textSecondary` (AC-37).
const TONE: Record<TripStatusKind, PillTone> = {
  upcoming: "accent",
  planned: "muted",
  draft: "muted",
  completed: "muted",
  archived: "muted",
};

/**
 * Localized status text: "in N days" / "today", "plan" (no dates), "completed" or "archived".
 * A trip that has already started (the nearest one may be under way) reads "today" rather than a
 * negative count.
 */
export function useTripStatusLabel({ status, startDate, today }: TripStatusPillProps): string {
  const { t } = useTranslation("common");
  if (status === "completed") return t("status.completed");
  if (status === "archived") return t("status.archived");
  if (status === "draft" || startDate === null) return t("status.plan");
  const days = daysBetween(today, startDate);
  return days <= 0 ? t("status.today") : t("status.inDays", { count: days });
}

/** Status chip of a trip (S4/S5 card, S7 header). */
export function TripStatusPill(props: TripStatusPillProps) {
  const label = useTripStatusLabel(props);
  return <Pill tone={TONE[props.status]} label={label} testID={props.testID} />;
}
