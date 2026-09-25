import { screen } from "@testing-library/react-native";
import { flagEmojiOf } from "@tripplanner/shared";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { CountryFlag } from "../CountryFlag";

const mockFlag = { FLAG_DISPLAY: "emoji" as "emoji" | "code" };
jest.mock("@/platform/flag", () => ({
  get FLAG_DISPLAY() {
    return mockFlag.FLAG_DISPLAY;
  },
}));

describe("CountryFlag", () => {
  afterEach(() => {
    mockFlag.FLAG_DISPLAY = "emoji";
  });

  it("draws the emoji in emoji mode and hides it from screen readers", async () => {
    await renderWithProviders(<CountryFlag countryCode="PL" testID="f" />);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toHaveTextContent(flagEmojiOf("PL") ?? "");
    expect(screen.getByTestId("f", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByTestId("f")).toBeNull();
  });

  it("draws the code in code mode", async () => {
    mockFlag.FLAG_DISPLAY = "code";
    await renderWithProviders(<CountryFlag countryCode="PL" testID="f" />);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toHaveTextContent("PL");
  });

  it("falls back to the code for an invalid code", async () => {
    await renderWithProviders(<CountryFlag countryCode="p1" testID="f" />);
    expect(screen.getByTestId("f", { includeHiddenElements: true })).toHaveTextContent("p1");
  });
});
