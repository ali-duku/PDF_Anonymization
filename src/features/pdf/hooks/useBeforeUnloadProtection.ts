import { useEffect } from "react";
import { SESSION_UNLOAD_WARNING_MESSAGE } from "../constants/session";

export function useBeforeUnloadProtection(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = SESSION_UNLOAD_WARNING_MESSAGE;
      return SESSION_UNLOAD_WARNING_MESSAGE;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
