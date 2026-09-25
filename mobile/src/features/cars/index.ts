// Public surface of the cars feature (S7 "Аренда авто" block, data hooks and formatters for the
// car form and view). The api module and `unwrapCar` stay internal.
export { CarBlock } from "./components/CarBlock";
export type { CarBlockProps } from "./components/CarBlock";
export { CarCard } from "./components/CarCard";
export type { CarCardProps } from "./components/CarCard";
export { CarNotFound } from "./components/CarNotFound";
export type { CarNotFoundProps } from "./components/CarNotFound";
export { carKeys } from "./hooks/queryKeys";
export { useCarsQuery } from "./hooks/useCarsQuery";
export type { CarsQueryResult } from "./hooks/useCarsQuery";
export { useCarQuery } from "./hooks/useCarQuery";
export type { CarQueryResult } from "./hooks/useCarQuery";
export { useCarMutations, useCreateCar, useDeleteCar, useUpdateCar } from "./hooks/useCarMutations";
export type {
  CarMutations,
  CreateCarMutation,
  CreateCarVariables,
  DeleteCarMutation,
  DeleteCarVariables,
  UpdateCarMutation,
  UpdateCarVariables,
} from "./hooks/useCarMutations";
export {
  formatCardMoment,
  formatMoneyAmount,
  formatRentalDay,
  formatRentalRange,
  formatViewMoment,
} from "./format";
export type { CarT } from "./format";
export { toCarCardData } from "./types";
export type { CarCardData } from "./types";
