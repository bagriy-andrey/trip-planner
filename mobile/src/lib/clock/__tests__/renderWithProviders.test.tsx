import { useQuery, useQueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { DEFAULT_TEST_TODAY, renderWithProviders } from "@/test-utils/renderWithProviders";

import { useToday } from "..";

function Today() {
  return <Text testID="today">{useToday()}</Text>;
}

describe("renderWithProviders: today and query client", () => {
  it("defaults today to a fixed date", async () => {
    await renderWithProviders(<Today />);
    expect(screen.getByTestId("today")).toHaveTextContent(DEFAULT_TEST_TODAY);
  });

  it("pins today to the given calendar date", async () => {
    await renderWithProviders(<Today />, { today: "2027-02-28" });
    expect(screen.getByTestId("today")).toHaveTextContent("2027-02-28");
  });

  it("gives every render its own QueryClient that does not retry", async () => {
    const seen: unknown[] = [];
    const queryFn = jest.fn(() => Promise.reject(new Error("nope")));
    function Probe() {
      seen.push(useQueryClient());
      const { status } = useQuery({ queryKey: ["k"], queryFn });
      return <Text testID="status">{status}</Text>;
    }
    const first = await renderWithProviders(<Probe />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
    expect(queryFn).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = await renderWithProviders(<Probe />);
    expect(second.queryClient).not.toBe(first.queryClient);
    expect(seen[0]).toBe(first.queryClient);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
  });
});
