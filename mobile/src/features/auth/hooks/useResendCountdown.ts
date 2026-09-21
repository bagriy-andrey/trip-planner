import { useCallback, useEffect, useState } from "react";

/** How long "send the code again" stays locked after a send (SPEC-02 AC-33). */
export const RESEND_COOLDOWN_SECONDS = 60;

export interface ResendCountdown {
  /** Whole seconds left, `0` when the action is available. */
  remaining: number;
  isLocked: boolean;
  /** Call right after a successful send: locks the action for the full cooldown. */
  start: () => void;
}

/**
 * Cooldown for "send the code again". Counts from wall-clock timestamps (not from ticks), so a
 * throttled or paused timer can never leave the action locked longer than it should be.
 * `sentAt` (`Date.now()` of the last send) starts the lock already running, e.g. when the screen
 * opens right after the first code was sent.
 */
export function useResendCountdown(
  sentAt: number | null = null,
  seconds: number = RESEND_COOLDOWN_SECONDS,
): ResendCountdown {
  const [endsAt, setEndsAt] = useState<number | null>(
    sentAt === null ? null : sentAt + seconds * 1000,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return undefined;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, [seconds]);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, isLocked: remaining > 0, start };
}
