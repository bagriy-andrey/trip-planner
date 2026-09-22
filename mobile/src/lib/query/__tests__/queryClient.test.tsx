import { render, screen, waitFor } from "@testing-library/react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

import { createQueryClient, QueryProvider, shouldRetry } from "..";

describe("shouldRetry", () => {
  it.each(["notFound", "denied", "unknown"])("never retries a %s failure", (kind) => {
    expect(shouldRetry(0, { kind })).toBe(false);
  });

  it.each(["offline", "timeout"])("retries a transient %s failure exactly once", (kind) => {
    expect(shouldRetry(0, { kind })).toBe(true);
    expect(shouldRetry(1, { kind })).toBe(false);
  });

  it("does not retry an error that carries no classification", () => {
    expect(shouldRetry(0, new Error("boom"))).toBe(false);
    expect(shouldRetry(0, undefined)).toBe(false);
    expect(shouldRetry(0, "offline")).toBe(false);
  });
});

describe("createQueryClient", () => {
  it("uses the classification-based retry for queries and never retries mutations", () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("has no optimistic-update machinery: no mutation defaults beyond retry", () => {
    const mutations = createQueryClient().getDefaultOptions().mutations;
    expect(Object.keys(mutations ?? {})).toEqual(["retry"]);
  });

  it("honours the test overrides", () => {
    const client = createQueryClient({ retry: false, gcTime: Infinity });
    expect(client.getDefaultOptions().queries).toEqual({ retry: false, gcTime: Infinity });
  });

  it("a query hits its function once when the client is set to retry:false", async () => {
    const fn = jest.fn(() => Promise.reject(Object.assign(new Error("x"), { kind: "offline" })));
    function Probe() {
      const { status } = useQuery({ queryKey: ["probe"], queryFn: fn });
      return <Text>{status}</Text>;
    }
    const client = createQueryClient({ retry: false, gcTime: Infinity });
    render(
      <QueryProvider client={client}>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByText("error")).toBeTruthy());
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
