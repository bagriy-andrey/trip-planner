import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Animated, Modal } from "react-native";

import { motion } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { PickerSheet } from "../picker";
import type { PickerItem, PickerSheetProps } from "../picker";

const ALL: PickerItem[] = [
  { key: "PL", name: "Poland", code: "PL", flagCountryCode: "PL" },
  { key: "PT", name: "Portugal", code: "PT", flagCountryCode: "PT" },
  { key: "DE", name: "Germany", code: "DE", flagCountryCode: "DE" },
];
const search = (q: string) => ALL.filter((i) => i.name.toLowerCase().startsWith(q.trim().toLowerCase()));

async function open(over: Partial<PickerSheetProps> = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  await renderWithProviders(
    <PickerSheet title="Country" selectedKey={null} search={search} onSelect={onSelect} onClose={onClose} testID="p" {...over} />,
  );
  return { onSelect, onClose };
}

describe("PickerSheet", () => {
  it("renders the header, search and rows with names and mono codes", async () => {
    await open();
    expect(screen.getByRole("header", { name: "Country" })).toBeOnTheScreen();
    expect(screen.getByTestId("p-search").props.autoFocus).toBe(true);
    expect(screen.getByLabelText("Poland, PL")).toBeOnTheScreen();
    expect(screen.queryByTestId("p-none")).toBeNull();
    expect(screen.queryByTestId("p-search-clear")).toBeNull();
  });

  it("selects after the exit animation, exactly once on a double tap", async () => {
    const { onSelect, onClose } = await open();
    const user = userEvent.setup();
    await user.press(screen.getByTestId("p-item-PL"));
    await user.press(screen.getByTestId("p-item-DE"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect).toHaveBeenCalledWith("PL");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancel, scrim and the Modal back request close without selecting", async () => {
    const { onSelect, onClose } = await open();
    await userEvent.press(screen.getByTestId("p-cancel"));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("the scrim closes without selecting", async () => {
    const { onSelect, onClose } = await open();
    await userEvent.press(screen.getByTestId("p-backdrop", { includeHiddenElements: true }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("onRequestClose of the Modal closes without selecting", async () => {
    const { onSelect, onClose } = await open();
    act(() => {
      screen.UNSAFE_getByType(Modal).props.onRequestClose();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks the selected row and offers Not specified first, which selects null", async () => {
    const { onSelect } = await open({ selectedKey: "PT" });
    expect(screen.getByTestId("p-item-PT").props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId("p-item-PL").props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByTestId("p-none")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("p-none"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null));
  });

  it("filters by query and clears it with the cross", async () => {
    await open();
    const user = userEvent.setup();
    await user.type(screen.getByTestId("p-search"), "Ger");
    expect(screen.queryByTestId("p-item-PL")).toBeNull();
    expect(screen.getByTestId("p-item-DE")).toBeOnTheScreen();
    await user.press(screen.getByTestId("p-search-clear"));
    expect(screen.getByTestId("p-item-PL")).toBeOnTheScreen();
    expect(screen.queryByTestId("p-search-clear")).toBeNull();
  });

  it("shows the optional and required no-results hints", async () => {
    const view = await open();
    await userEvent.type(screen.getByTestId("p-search"), "zzz");
    expect(screen.getByText("No results")).toBeOnTheScreen();
    expect(screen.getByText(/leave the field empty/)).toBeOnTheScreen();
    expect(view.onSelect).not.toHaveBeenCalled();
  });

  it("required drops the optional remark", async () => {
    await open({ required: true });
    await userEvent.type(screen.getByTestId("p-search"), "zzz");
    expect(screen.getByText("Check the spelling.")).toBeOnTheScreen();
  });

  it("emptyWhenBlank replaces an empty list for a blank query", async () => {
    await open({ search: () => [], emptyWhenBlank: { title: "No cities", body: "Leave it empty" } });
    expect(screen.getByText("No cities")).toBeOnTheScreen();
    expect(screen.getByText("Leave it empty")).toBeOnTheScreen();
  });

  it("animates in with the theme duration", async () => {
    const timing = jest.spyOn(Animated, "timing");
    await open();
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: motion.sheetEnter }),
    );
  });
});
