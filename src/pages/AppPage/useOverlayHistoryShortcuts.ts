import { useEffect } from "react";

interface UseOverlayHistoryShortcutsOptions {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

export function useOverlayHistoryShortcuts({
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: UseOverlayHistoryShortcutsOptions): void {
  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const commandKey = event.ctrlKey || event.metaKey;
      if (!commandKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);

      if (wantsUndo && canUndo) {
        event.preventDefault();
        onUndo();
        return;
      }

      if (wantsRedo && canRedo) {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [canRedo, canUndo, onRedo, onUndo]);
}
