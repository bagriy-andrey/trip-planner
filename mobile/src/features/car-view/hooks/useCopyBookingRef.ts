import { useCallback, useEffect, useRef, useState } from "react";

import { copyText } from "@/platform/clipboard";

import { COPIED_FEEDBACK_MS } from "../constants";

export interface CopyBookingRef {
  copied: boolean;
  failed: boolean;
  copy: () => Promise<void>;
}

/** Copies the booking reference; "copied" lasts `COPIED_FEEDBACK_MS`. The text is never logged (AC-45). */
export function useCopyBookingRef(text: string): CopyBookingRef {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const ok = await copyText(text);
    if (!mounted.current) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setFailed(!ok);
    setCopied(ok);
    if (ok) {
      timer.current = setTimeout(() => {
        timer.current = null;
        setCopied(false);
      }, COPIED_FEEDBACK_MS);
    }
  }, [text]);

  return { copied, failed, copy };
}
