import { describe, expect, it } from "vitest";
import { coverIndexOf, resolveDestinationName, type Trip } from "../../index";

const PALETTE = 5; // `coverColors` has five slots

function fakeUuid(n: number): string {
  const hex = (n * 2654435761 + 12345).toString(16).padStart(12, "0").slice(-12);
  return `5b1e3c0e-1c3f-4c6e-9a53-${hex}`;
}

describe("coverIndexOf (AC-38)", () => {
  it("is stable: the same id always yields the same index", () => {
    const id = "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11";
    const first = coverIndexOf(id, PALETTE);
    for (let i = 0; i < 20; i += 1) expect(coverIndexOf(id, PALETTE)).toBe(first);
  });

  it("is pinned: known ids keep their slot across releases (changing the hash recolours every card)", () => {
    // 32-bit FNV-1a reference values: "" = 0x811c9dc5 = 2166136261, "a" = 0xe40c292c = 3826002220
    expect(coverIndexOf("", 1000)).toBe(261);
    expect(coverIndexOf("a", 1000)).toBe(220);
    expect(coverIndexOf("5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11", 5)).toBe(3);
    expect(coverIndexOf("trip-1", 5)).toBe(0);
  });

  it("does not change when the trip is edited: only the id is an input", () => {
    // The signature takes the id and nothing else — a rename, a new title, another UI language or
    // another place cannot reach it. Same id, before and after an 'edit', same slot.
    const before: Pick<Trip, "id" | "destination" | "title"> = { id: fakeUuid(7), destination: "Порту", title: null };
    const after = { ...before, destination: "Лиссабон", title: "Отпуск" };
    expect(coverIndexOf(after.id, PALETTE)).toBe(coverIndexOf(before.id, PALETTE));
  });

  it("stays within 0..paletteLength-1", () => {
    for (let n = 0; n < 500; n += 1) {
      const index = coverIndexOf(fakeUuid(n), PALETTE);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(PALETTE);
    }
  });

  it("uses ALL 5 palette slots over a set of ids, none starved", () => {
    const counts = new Array<number>(PALETTE).fill(0);
    const total = 500;
    for (let n = 0; n < total; n += 1) {
      const index = coverIndexOf(fakeUuid(n), PALETTE);
      counts[index] = (counts[index] ?? 0) + 1;
    }
    for (const [slot, count] of counts.entries()) {
      // an even split is 100; anything under 60 would be a visibly lopsided palette
      expect(count, `slot ${slot}`).toBeGreaterThan(60);
    }
  });

  it("also covers every slot for short sequential ids", () => {
    const used = new Set<number>();
    for (let n = 0; n < 40; n += 1) used.add(coverIndexOf(`trip-${n}`, PALETTE));
    expect(used.size).toBe(PALETTE);
  });

  it("works for any palette size and rejects a bad one", () => {
    expect(coverIndexOf("x", 1)).toBe(0);
    expect(coverIndexOf("x", 7)).toBeLessThan(7);
    expect(() => coverIndexOf("x", 0)).toThrow(RangeError);
    expect(() => coverIndexOf("x", -1)).toThrow(RangeError);
    expect(() => coverIndexOf("x", 2.5)).toThrow(RangeError);
    expect(() => coverIndexOf("x", Number.NaN)).toThrow(RangeError);
  });
});

describe("resolveDestinationName (Q3)", () => {
  const cityTrip: Pick<Trip, "destination" | "place"> = {
    destination: "Порту",
    place: { kind: "city", placeId: "city-porto", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "OPO" },
  };

  it("a known city/country id gives the directory name in the UI language", () => {
    expect(resolveDestinationName(cityTrip, "ru")).toBe("Порту");
    expect(resolveDestinationName(cityTrip, "en")).toBe("Porto");
    const countryTrip: Pick<Trip, "destination" | "place"> = {
      destination: "Португалия",
      place: { kind: "country", placeId: "country-pt", countryCode: "PT" },
    };
    expect(resolveDestinationName(countryTrip, "en")).toBe("Portugal");
    expect(resolveDestinationName(countryTrip, "ru")).toBe("Португалия");
  });

  it("free text shows the stored destination as is, in either language", () => {
    const custom: Pick<Trip, "destination" | "place"> = { destination: "Тоскана", place: { kind: "custom" } };
    expect(resolveDestinationName(custom, "en")).toBe("Тоскана");
    expect(resolveDestinationName(custom, "ru")).toBe("Тоскана");
  });

  it("an UNKNOWN place id is not an error: the stored destination is the fallback", () => {
    const stale: Pick<Trip, "destination" | "place"> = {
      destination: "Атлантида",
      place: { kind: "city", placeId: "city-atlantis", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: null },
    };
    expect(resolveDestinationName(stale, "en")).toBe("Атлантида");
  });

  it("a place id whose directory record has another kind falls back to the stored destination", () => {
    const mismatched: Pick<Trip, "destination" | "place"> = {
      destination: "Порту",
      place: { kind: "country", placeId: "city-porto", countryCode: "PT" },
    };
    expect(resolveDestinationName(mismatched, "en")).toBe("Порту");
  });
});
