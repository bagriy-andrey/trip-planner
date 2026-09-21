import { QueryClient } from "@tanstack/react-query";
import type { DefaultOptions } from "@tanstack/react-query";

/**
 * Error kinds the trips api layer classifies failures into (step 7 owns the classifier and the
 * canonical type). Redeclared structurally here so `lib/` does not import from `features/`.
 */
type TransientKind = "offline" | "timeout";

function kindOf(error: unknown): unknown {
  return typeof error === "object" && error !== null && "kind" in error
    ? (error as { kind: unknown }).kind
    : undefined;
}

/** Only a failure that may go away by itself is worth another attempt. */
function isTransient(error: unknown): boolean {
  const kind = kindOf(error);
  const transient: readonly TransientKind[] = ["offline", "timeout"];
  return transient.some((candidate) => candidate === kind);
}

/**
 * Retry follows the api error classification, not TanStack's default (3 attempts with backoff
 * for everything): "notFound" and "denied" can never succeed on a retry, and "unknown" is not
 * known to be transient, so none of those are retried; "offline" and "timeout" get exactly one
 * more attempt. An error that carries no `kind` (a bug, a failed parse) is not retried either.
 * The user retries explicitly (a "Retry" action), which keeps error states quick and honest.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isTransient(error);
}

export interface CreateQueryClientOptions {
  /** Test override: `false` fails on the first error. Defaults to `shouldRetry`. */
  retry?: false;
  /** Test override: `Infinity` leaves no garbage-collection timer running after a test. */
  gcTime?: number;
}

/**
 * The app's `QueryClient`. Mutations are never retried and there are no optimistic updates
 * (SPEC-03 contract 3): the UI changes only after the server answered and the affected keys were
 * invalidated, so a failed write can never leave a phantom trip on screen.
 */
export function createQueryClient(options: CreateQueryClientOptions = {}): QueryClient {
  const defaultOptions: DefaultOptions = {
    queries: {
      retry: options.retry ?? shouldRetry,
      ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
    },
    mutations: { retry: false },
  };
  return new QueryClient({ defaultOptions });
}
