import { screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { BaggageToggle } from "../components/BaggageToggle";

function Harness({ initial }: { initial: boolean }) {
  const [value, setValue] = useState(initial);
  return <BaggageToggle label="Baggage included" value={value} onChange={setValue} testID="baggage-toggle" />;
}

describe("BaggageToggle", () => {
  it("reflects the given value via accessibilityState", async () => {
    await renderWithProviders(<Harness initial={false} />);
    expect(screen.getByRole("switch", { name: "Baggage included" })).not.toBeChecked();
  });

  it("flips on press and calls onChange", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<Harness initial={false} />);
    await user.press(screen.getByRole("switch", { name: "Baggage included" }));
    expect(screen.getByRole("switch", { name: "Baggage included" })).toBeChecked();
  });
});
