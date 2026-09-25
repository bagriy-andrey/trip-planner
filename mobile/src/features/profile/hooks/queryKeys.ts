/** Keyed by user id (D-4): a new identity never reads another user's cached profile. */
export const profileKeys = {
  all: ["profile"] as const,
  mine: (userId: string) => ["profile", userId] as const,
};
