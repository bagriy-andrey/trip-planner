import { parseMapsUrl } from "@tripplanner/shared";
import { useState } from "react";
import { Linking } from "react-native";




/** The two fields a form must expose for the maps link (any feature's state). */
type MapsFields = { mapsUrl: string | null; mapsUrlText: string };

/**
 * The maps-link field (AC-24..AC-27). Typing keeps the raw text; the link is ACCEPTED (and shown as
 * the "added" row) when the field is left or submitted, so a half-typed link never swaps the field
 * mid-keystroke. Acceptance and re-checking before opening are `shared`'s `parseMapsUrl`; no network
 * request is ever made for the link, and no `canOpenURL` probe.
 */
export function useMapsLink(state: MapsFields, apply: (changes: Partial<MapsFields>) => void) {
  const [openFailed, setOpenFailed] = useState(false);

  const changeText = (text: string) => {
    setOpenFailed(false);
    apply({ mapsUrlText: text, mapsUrl: null });
  };

  /** Blur / submit: a valid link becomes the accepted, normalized one; invalid text stays for the error. */
  const commit = () => {
    if (state.mapsUrl !== null || state.mapsUrlText.trim() === "") return;
    const parsed = parseMapsUrl(state.mapsUrlText);
    if (parsed.ok) apply({ mapsUrl: parsed.url, mapsUrlText: parsed.url });
  };

  const remove = () => {
    setOpenFailed(false);
    apply({ mapsUrl: null, mapsUrlText: "" });
  };

  /** Re-checks the stored link (untrusted input) and hands it to the system. */
  const open = async () => {
    const parsed = parseMapsUrl(state.mapsUrl);
    if (!parsed.ok) {
      setOpenFailed(true);
      return;
    }
    setOpenFailed(false);
    try {
      await Linking.openURL(parsed.url);
    } catch {
      setOpenFailed(true);
    }
  };

  return { openFailed, changeText, commit, remove, open: () => void open() };
}
