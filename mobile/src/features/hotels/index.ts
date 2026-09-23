// Public surface of the hotels feature (S7 "Отель" block, data hooks for the hotel form).
// `unwrapHotel` and the api module stay internal.
export { HotelBlock } from "./components/HotelBlock";
export type { HotelBlockProps } from "./components/HotelBlock";
export { HotelCard } from "./components/HotelCard";
export type { HotelCardProps } from "./components/HotelCard";
export { hotelKeys } from "./hooks/queryKeys";
export { useHotelsQuery } from "./hooks/useHotelsQuery";
export type { HotelsQueryResult } from "./hooks/useHotelsQuery";
export { useHotelQuery } from "./hooks/useHotelQuery";
export type { HotelQueryResult } from "./hooks/useHotelQuery";
export {
  useCreateHotel,
  useDeleteHotel,
  useHotelMutations,
  useUpdateHotel,
} from "./hooks/useHotelMutations";
export type {
  CreateHotelMutation,
  CreateHotelVariables,
  DeleteHotelMutation,
  DeleteHotelVariables,
  HotelMutations,
  UpdateHotelMutation,
  UpdateHotelVariables,
} from "./hooks/useHotelMutations";
export { toHotelCardData } from "./types";
export type { BreakfastChip, HotelCardData } from "./types";
