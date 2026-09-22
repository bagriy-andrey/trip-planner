import { fireEvent, screen } from "@testing-library/react-native";
import { findAirportByCode } from "@tripplanner/shared";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { NotClosedCard } from "../components/NotClosedCard";

const VIE = findAirportByCode("VIE")!;

describe("NotClosedCard", () => {
  it("shows the title, the explanation and a button naming the open city", async () => {
    const onAddFlight = jest.fn();
    await renderWithProviders(
      <NotClosedCard
        openAt={{ cityId: VIE.cityId, airportCode: VIE.iata }}
        locale="en"
        onAddFlight={onAddFlight}
        testID="not-closed"
      />,
    );
    expect(screen.getByText("Route not closed")).toBeTruthy();
    const button = screen.getByRole("button", { name: /Add flight from/ });
    fireEvent.press(button);
    expect(onAddFlight).toHaveBeenCalledWith({ cityId: VIE.cityId, airportCode: VIE.iata });
  });

  it("has a dashed border (distinct from a plain empty-state frame)", async () => {
    const { getByTestId } = await renderWithProviders(
      <NotClosedCard
        openAt={{ cityId: VIE.cityId, airportCode: VIE.iata }}
        locale="en"
        onAddFlight={jest.fn()}
        testID="not-closed"
      />,
    );
    const style = getByTestId("not-closed").props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.borderStyle).toBe("dashed");
  });
});
