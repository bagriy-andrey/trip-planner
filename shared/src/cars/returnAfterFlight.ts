import { isClockTime, zonedDateTimeToInstant } from "../segments/time";
import { isCalendarDate } from "../trips/calendarDate";

export type RentalMoments = {
  pickupDate: string | null | undefined;
  pickupTime: string | null | undefined;
  returnDate: string | null | undefined;
  returnTime: string | null | undefined;
};

/** Structural: a `Segment` fits. */
export type FlightDeparture = {
  from: { timeZone: string };
  departureAt: Date;
};

/**
 * The rental is due back after the nearest flight that departs after pickup: gives that flight's
 * departure (with its zone, for display) or `null` when no warning applies. Rental times are read
 * in the departure airport's zone (the rental stores none). Invalid input gives `null`.
 */
export function carReturnAfterFlight(
  rental: RentalMoments,
  flights: readonly FlightDeparture[],
): { departureAt: Date; timeZone: string } | null {
  const { pickupDate, pickupTime, returnDate, returnTime } = rental;
  if (
    !isCalendarDate(pickupDate) ||
    !isCalendarDate(returnDate) ||
    !isClockTime(pickupTime) ||
    !isClockTime(returnTime)
  ) {
    return null;
  }

  let nearest: FlightDeparture | null = null;
  for (const flight of flights) {
    const pickupAt = zonedDateTimeToInstant(pickupDate, pickupTime, flight.from.timeZone);
    if (flight.departureAt.getTime() <= pickupAt.getTime()) continue;
    if (nearest === null || flight.departureAt.getTime() < nearest.departureAt.getTime()) nearest = flight;
  }
  if (nearest === null) return null;

  const zone = nearest.from.timeZone;
  const returnAt = zonedDateTimeToInstant(returnDate, returnTime, zone);
  if (returnAt.getTime() > nearest.departureAt.getTime()) {
    return { departureAt: nearest.departureAt, timeZone: zone };
  }
  return null;
}
