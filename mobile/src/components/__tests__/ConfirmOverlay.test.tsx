import { screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ConfirmOverlay } from "../ConfirmOverlay";

describe("ConfirmOverlay", () => {
  it("renders children and closes on scrim tap", async () => {
    const onClose = jest.fn();
    await renderWithProviders(
      <ConfirmOverlay closeLabel="Close" onClose={onClose} testID="ov">
        <Text>body</Text>
      </ConfirmOverlay>,
    );
    expect(screen.getByText("body")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId("ov-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
