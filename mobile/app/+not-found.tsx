import { Redirect } from "expo-router";

// Service fallback for unknown URLs (e.g. a future deep link). PLAN-01 asks for the legal
// placeholder plus a "go home" button, but no i18n keys exist for that text yet, so this
// sends the user home instead of rendering hardcoded strings.
export default function NotFound() {
  return <Redirect href="/" />;
}
