import type { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { SessionContext } from "@/lib/session/useSession";
import type { SessionContextValue } from "@/lib/session/useSession";
import { makeTestUser } from "@/test-utils/renderWithProviders";

import { createQueryClient, QueryCacheGuard, QueryProvider } from "..";

const KEY = ["trips"] as const;

function sessionOf(status: SessionContextValue["status"], userId?: string): SessionContextValue {
  return {
    status,
    user: status === "signedIn" ? makeTestUser({ id: userId ?? "user-1" }) : null,
    isRoutedAsSignedIn: status === "signedIn",
    holdGating: () => () => undefined,
  };
}

function tree(client: QueryClient, session: SessionContextValue): ReactElement {
  return (
    <SessionContext.Provider value={session}>
      <QueryProvider client={client}>
        <QueryCacheGuard />
      </QueryProvider>
    </SessionContext.Provider>
  );
}

function setup(initial: SessionContextValue) {
  const client = createQueryClient({ retry: false, gcTime: Infinity });
  client.setQueryData(KEY, ["user A's trip"]);
  const view = render(tree(client, initial));
  return { client, rerender: (next: SessionContextValue) => view.rerender(tree(client, next)) };
}

describe("QueryCacheGuard (the cache never outlives the account)", () => {
  it("empties the cache when the session ends", () => {
    const { client, rerender } = setup(sessionOf("signedIn", "user-a"));
    expect(client.getQueryData(KEY)).toEqual(["user A's trip"]);
    rerender(sessionOf("signedOut"));
    expect(client.getQueryCache().getAll()).toEqual([]);
    expect(client.getQueryData(KEY)).toBeUndefined();
  });

  it("empties the cache when the signed-in user id changes, without a sign-out in between", () => {
    const { client, rerender } = setup(sessionOf("signedIn", "user-a"));
    rerender(sessionOf("signedIn", "user-b"));
    expect(client.getQueryCache().getAll()).toEqual([]);
  });

  it("keeps the cache on a re-render and on a session update for the same user", () => {
    const { client, rerender } = setup(sessionOf("signedIn", "user-a"));
    rerender(sessionOf("signedIn", "user-a"));
    // A refreshed token produces a new session object with the same account.
    rerender({ ...sessionOf("signedIn", "user-a"), user: makeTestUser({ id: "user-a", displayName: "Renamed" }) });
    expect(client.getQueryData(KEY)).toEqual(["user A's trip"]);
  });

  it("does not clear on the first identity after launch (restoring -> signedIn)", () => {
    const { client, rerender } = setup(sessionOf("restoring"));
    rerender(sessionOf("signedIn", "user-a"));
    expect(client.getQueryData(KEY)).toEqual(["user A's trip"]);
  });

  it("keeps data written after sign-in for the NEXT user's session, and clears again on the next sign-out", () => {
    const { client, rerender } = setup(sessionOf("signedIn", "user-a"));
    rerender(sessionOf("signedOut"));
    client.setQueryData(KEY, ["user B's trip"]);
    rerender(sessionOf("signedIn", "user-b"));
    expect(client.getQueryData(KEY)).toEqual(["user B's trip"]);
    rerender(sessionOf("signedOut"));
    expect(client.getQueryData(KEY)).toBeUndefined();
  });
});
