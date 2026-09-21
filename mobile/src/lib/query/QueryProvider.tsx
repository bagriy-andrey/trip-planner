import { QueryClientProvider } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

import { createQueryClient } from "./queryClient";

export interface QueryProviderProps {
  children: ReactNode;
  /** Tests pass their own client; the app lets the provider create one. */
  client?: QueryClient;
}

/** Owns one `QueryClient` for the lifetime of the tree (created once, not per render). */
export function QueryProvider({ children, client }: QueryProviderProps) {
  const [owned] = useState(() => client ?? createQueryClient());
  return <QueryClientProvider client={owned}>{children}</QueryClientProvider>;
}
