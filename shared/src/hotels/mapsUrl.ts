export const MAPS_URL_MAX_LENGTH = 2048;

export type MapsUrlError = "mapsUrl.notGoogleMaps" | "mapsUrl.tooLong";
export type MapsUrlResult = { ok: true; url: string } | { ok: false; error: MapsUrlError };

const NOT_MAPS: MapsUrlResult = { ok: false, error: "mapsUrl.notGoogleMaps" };
// Whitespace and control characters anywhere inside.
const FORBIDDEN_INSIDE = /[\u0000- \u007F]/;
const AUTHORITY = /^[A-Za-z0-9.-]+$/;
const SCHEME = "https://";

function pathIsMaps(rest: string): boolean {
  if (!rest.startsWith("/maps")) return false;
  const next = rest.charAt("/maps".length);
  return next === "" || next === "/" || next === "?" || next === "#";
}

function pathIsShortMaps(rest: string): boolean {
  return rest === "/maps" || rest.startsWith("/maps/");
}

/**
 * Accepts only https links to Google Maps hosts, parsed by hand over ASCII (no URL class: the
 * Hermes polyfill differs from Node/Deno). Host equality is exact; the rest is kept unchanged.
 */
export function parseMapsUrl(input: unknown): MapsUrlResult {
  if (typeof input !== "string") return NOT_MAPS;
  const text = input.trim();
  if (FORBIDDEN_INSIDE.test(text)) return NOT_MAPS;
  if (text.slice(0, SCHEME.length).toLowerCase() !== SCHEME) return NOT_MAPS;
  const afterScheme = text.slice(SCHEME.length);
  const end = afterScheme.search(/[/?#]/);
  const authority = end === -1 ? afterScheme : afterScheme.slice(0, end);
  const rest = end === -1 ? "" : afterScheme.slice(end);
  if (!AUTHORITY.test(authority)) return NOT_MAPS;
  const host = authority.toLowerCase();

  let allowed: boolean;
  if (host === "www.google.com" || host === "google.com") allowed = pathIsMaps(rest);
  else if (host === "maps.google.com" || host === "maps.app.goo.gl") allowed = true;
  else if (host === "goo.gl") allowed = pathIsShortMaps(rest);
  else allowed = false;
  if (!allowed) return NOT_MAPS;

  const url = `${SCHEME}${host}${rest}`;
  if (Array.from(url).length > MAPS_URL_MAX_LENGTH) return { ok: false, error: "mapsUrl.tooLong" };
  return { ok: true, url };
}
