// Memory of the auth flows that span two screens. It is MODULE state on purpose, not route
// params (SPEC-02 AC-39: a route param is untrusted input and ends up in URLs and logs):
//
// - S10 -> S10b: the email the code was sent to, and when (drives the 60 s resend lock).
// - S3 -> S2: the email to prefill after "this email is already registered" (AC-13).
//
// Only an email lives here. A password, a new password or a recovery code NEVER does — they stay
// in the component state of the screen that owns the field and die with it.

export interface ResetFlow {
  /** Normalised address the recovery code was requested for. */
  email: string;
  /** `Date.now()` of the request; the resend cooldown counts from here. */
  requestedAt: number;
}

let resetFlow: ResetFlow | null = null;
let signInPrefill: string | null = null;
const prefillListeners = new Set<() => void>();

export function startResetFlow(email: string, requestedAt: number = Date.now()): void {
  resetFlow = { email, requestedAt };
}

export function getResetFlow(): ResetFlow | null {
  return resetFlow;
}

export function clearResetFlow(): void {
  resetFlow = null;
}

function setPrefill(next: string | null): void {
  signInPrefill = next;
  prefillListeners.forEach((listener) => listener());
}

/** S3 hands the already-registered email to S2, which may be mounted already (navigate pops back). */
export function setSignInPrefill(email: string): void {
  setPrefill(email);
}

export function clearSignInPrefill(): void {
  if (signInPrefill !== null) setPrefill(null);
}

export function subscribeSignInPrefill(listener: () => void): () => void {
  prefillListeners.add(listener);
  return () => {
    prefillListeners.delete(listener);
  };
}

export function getSignInPrefill(): string | null {
  return signInPrefill;
}

/** Test helper: back to a pristine module state. */
export function resetFlowStateForTests(): void {
  resetFlow = null;
  signInPrefill = null;
  prefillListeners.clear();
}
