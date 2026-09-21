import { Redirect } from "expo-router";

import { useSession } from "@/lib/session";

// Service route, not a screen: a cold start lands on /trips with a session and on onboarding
// without one (SPEC-02 AC-1). The shell renders nothing until the session is restored, so
// this never runs in the `restoring` state.
export default function Index() {
  const { isRoutedAsSignedIn } = useSession();
  return <Redirect href={isRoutedAsSignedIn ? "/trips" : "/onboarding"} />;
}
