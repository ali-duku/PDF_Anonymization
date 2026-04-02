import { useEffect } from "react";
import { isEditableEventTarget } from "../utils/editableTarget";

interface UsePdfSessionKeyboardShortcutsOptions {
  isEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function usePdfSessionKeyboardShortcuts({
  isEnabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: UsePdfSessionKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableEventTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasControlModifier = event.metaKey || event.ctrlKey;
      if (!hasControlModifier) {
        return;
      }

      const shouldUndo = key === "z" && !event.shiftKey;
      const shouldRedo = key === "y" || (key === "z" && event.shiftKey);

      if (shouldUndo && canUndo) {
        event.preventDefault();
        onUndo();
      }

      if (shouldRedo && canRedo) {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [canRedo, canUndo, isEnabled, onRedo, onUndo]);
}
