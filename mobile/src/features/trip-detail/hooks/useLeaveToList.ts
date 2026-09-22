import { useRouter } from "expo-router";

/**
 * Leaves the details for the list the user came from (AC-55): back in the stack, which is the
 * Trips or the History tab. A details screen opened without history (a link) has nothing to go
 * back to, so it lands on the Trips tab instead of doing nothing.
 */
export function useLeaveToList(): () => void {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace("/trips");
  };
}
