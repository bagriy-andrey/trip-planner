import { useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

/**
 * Close handling with an unsaved-changes guard (AC-41). Swipe-down / hardware back go through the
 * navigator, not `requestClose`: while `dirty` they are intercepted via `beforeRemove`. Our own
 * exits (saved, deleted, discarded) call `leave`, which flags itself first so the guard lets it by.
 */
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const navigation = useNavigation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return undefined;
    return navigation.addListener("beforeRemove", (event) => {
      if (leaving.current) return;
      event.preventDefault();
      setConfirmOpen(true);
    });
  }, [dirty, navigation]);

  const leave = () => {
    leaving.current = true;
    router.back();
  };

  return {
    leave,
    /** Lets the next removal through without navigating (the caller navigates itself, e.g. `replace`). */
    allowExit: () => {
      leaving.current = true;
    },
    confirmOpen,
    requestClose: () => (dirty ? setConfirmOpen(true) : leave()),
    confirmDiscard: () => {
      setConfirmOpen(false);
      leave();
    },
    cancelConfirm: () => setConfirmOpen(false),
  };
}
