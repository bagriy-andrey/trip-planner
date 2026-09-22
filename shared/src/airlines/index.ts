export { AIRLINE_DESIGNATOR_PATTERN, airlineRecordSchema } from "./schema";
export type { AirlineRecord } from "./schema";
export { AIRLINES } from "./airlines";
export {
  FLIGHT_NUMBER_PATTERN,
  findAirline,
  normalizeFlightNumber,
  parseFlightNumber,
} from "./flightNumber";
export type { ParsedFlightNumber } from "./flightNumber";
