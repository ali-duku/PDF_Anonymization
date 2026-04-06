import { useEffect } from "react";
import { PDF_SESSION_SHORTCUTS } from "../constants/keyboardShortcuts";
import { isEditableEventTarget } from "../utils/editableTarget";
import {
  matchesAnyKeyboardShortcut,
  matchesKeyboardShortcut
} from "../utils/keyboardShortcuts";

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

      const shouldUndo = matchesKeyboardShortcut(event, PDF_SESSION_SHORTCUTS.undo);
      const shouldRedo = matchesAnyKeyboardShortcut(event, PDF_SESSION_SHORTCUTS.redo);

      if (shouldUndo && canUndo) {
        event.preventDefault();
        onUndo();
        return;
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
