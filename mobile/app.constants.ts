// Single source of truth for app identity. Read by app.config.ts (Node context)
// and by the RN bundle, so this file must stay import-free.
export const APP_NAME = "TripPlanner";
export const APP_SCHEME = "tripplanner";
export const APP_SLUG = "tripplanner";

export const SUPPORTED_LOCALES = ["ru", "en"] as const;
export const DEFAULT_LOCALE = "en";
