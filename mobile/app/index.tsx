import { Redirect } from "expo-router";

// Service route, not a screen: a cold start lands on onboarding (AC-1).
export default function Index() {
  return <Redirect href="/onboarding" />;
}
