import type { Profile, ProfilePatch } from "@tripplanner/shared";

/** One write that has been shown on screen but not yet answered by the server (D-6). */
export interface PendingPatch {
  seq: number;
  patch: ProfilePatch;
}

function definedOnly(patch: ProfilePatch): ProfilePatch {
  const out: ProfilePatch = {};
  if (patch.citizenship !== undefined) out.citizenship = patch.citizenship;
  if (patch.residence !== undefined) out.residence = patch.residence;
  if (patch.homeCityId !== undefined) out.homeCityId = patch.homeCityId;
  if (patch.homeAirport !== undefined) out.homeAirport = patch.homeAirport;
  if (patch.homeCurrency !== undefined) out.homeCurrency = patch.homeCurrency;
  return out;
}

/** The screen value: the server copy with every pending patch applied in order. */
export function overlay(base: Profile, queue: readonly PendingPatch[]): Profile {
  let result: Profile = base;
  for (const { patch } of queue) {
    result = { ...result, ...definedOnly(patch) };
  }
  return result;
}

export function enqueue(queue: readonly PendingPatch[], entry: PendingPatch): PendingPatch[] {
  return [...queue, entry];
}

/** Drops patch `seq` (answered: success or failure). */
export function settle(queue: readonly PendingPatch[], seq: number): PendingPatch[] {
  return queue.filter((entry) => entry.seq !== seq);
}
