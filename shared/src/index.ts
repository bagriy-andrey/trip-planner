// Public surface of @tripplanner/shared.
export * from "./airlines";
export * from "./auth";
export * from "./hotels";
export * from "./money";
export * from "./places";
export * from "./segments";
export * from "./trips";
export { parseForm } from "./forms/parse";
export type { FormFieldErrors, FormResult } from "./forms/parse";
// The generated DB types stay type-only; the `trips` row/insert shapes are the source of truth for
// `tripRowSchema` / `TripWrite` (they are tested against them).
export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./db/database.types";
