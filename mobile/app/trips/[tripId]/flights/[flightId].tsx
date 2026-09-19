import { BookingFormScreen } from "@/features/booking-form";

// The skeleton has no data layer: any `flightId` shows the same blank flight form.
export default function FlightRoute() {
  return <BookingFormScreen variant="flight" />;
}
