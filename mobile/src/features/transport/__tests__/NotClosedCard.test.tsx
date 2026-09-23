import { screen } from "@testing-library/react-native";
import { findAirportByCode } from "@tripplanner/shared";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { NotClosedCard } from "../components/NotClosedCard";

const VIE = findAirportByCode("VIE")!;

describe("NotClosedCard", () => {
  it("shows the title and the explanation naming the open city, with no button (view-only)", async () => {
    await renderWithProviders(
      <NotClosedCard
        openAt={{ cityId: VIE.cityId, airportCode: VIE.iata }}
        locale="en"
        testID="not-closed"
      />,
    );
    expect(screen.getByText("Route not closed")).toBeTruthy();
    expect(screen.getByText(/leaves you in Vienna/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has a dashed border (distinct from a plain empty-state frame)", async () => {
    const { getByTestId } = await renderWithProviders(
      <NotClosedCard
        openAt={{ cityId: VIE.cityId, airportCode: VIE.iata }}
        locale="en"
        testID="not-closed"
      />,
    );
    const style = getByTestId("not-closed").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.borderStyle).toBe("dashed");
  });
});
