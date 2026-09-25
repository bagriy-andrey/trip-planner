import { setStringAsync } from "expo-clipboard";

import { copyText } from "../clipboard";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));

const mockSet = setStringAsync as jest.Mock;

describe("copyText", () => {
  it("returns true when the clipboard accepts the text", async () => {
    mockSet.mockResolvedValueOnce(true);
    await expect(copyText("ABC123")).resolves.toBe(true);
    expect(mockSet).toHaveBeenCalledWith("ABC123");
  });

  it("returns false when the native call rejects", async () => {
    mockSet.mockRejectedValueOnce(new Error("no module"));
    await expect(copyText("ABC123")).resolves.toBe(false);
  });
});
