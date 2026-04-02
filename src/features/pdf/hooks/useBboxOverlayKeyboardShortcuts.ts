import { useEffect } from "react";
import { isEditableEventTarget } from "../utils/editableTarget";

interface UseBboxOverlayKeyboardShortcutsOptions {
  isEnabled: boolean;
  selectedBboxId: string | null;
  editingBboxId: string | null;
  hasDraftCreation: boolean;
  hasActiveInteraction: boolean;
  canPasteBbox: boolean;
  onCancelDraftCreation: () => void;
  onCloseEditor: () => void;
  onClearSelection: () => void;
  onDeleteBbox: (bboxId: string) => void;
  onStartEditingBbox: (bboxId: string) => void;
  onCopyBbox: (bboxId: string) => void;
  onPasteBbox: () => void;
}

export function useBboxOverlayKeyboardShortcuts({
  isEnabled,
  selectedBboxId,
  editingBboxId,
  hasDraftCreation,
  hasActiveInteraction,
  canPasteBbox,
  onCancelDraftCreation,
  onCloseEditor,
  onClearSelection,
  onDeleteBbox,
  onStartEditingBbox,
  onCopyBbox,
  onPasteBbox
}: UseBboxOverlayKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableEventTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;
      // Keep native text-edit shortcuts untouched while label editor or drag interactions are active.
      const canRunClipboardShortcut =
        !editingBboxId && !hasDraftCreation && !hasActiveInteraction;

      if (hasShortcutModifier && !event.altKey && !event.shiftKey) {
        if (key === "c" && selectedBboxId && canRunClipboardShortcut) {
          event.preventDefault();
          onCopyBbox(selectedBboxId);
          return;
        }

        if (key === "v" && canPasteBbox && canRunClipboardShortcut) {
          event.preventDefault();
          onPasteBbox();
          return;
        }
      }

      if (event.key === "Escape" && hasDraftCreation) {
        event.preventDefault();
        onCancelDraftCreation();
        return;
      }

      if (event.key === "Escape" && editingBboxId) {
        event.preventDefault();
        onCloseEditor();
        return;
      }

      if (event.key === "Escape" && selectedBboxId) {
        event.preventDefault();
        onClearSelection();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedBboxId &&
        !editingBboxId
      ) {
        event.preventDefault();
        onDeleteBbox(selectedBboxId);
        return;
      }

      if (
        event.key === "Enter" &&
        selectedBboxId &&
        !editingBboxId &&
        !hasDraftCreation &&
        !hasActiveInteraction
      ) {
        event.preventDefault();
        onStartEditingBbox(selectedBboxId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canPasteBbox,
    editingBboxId,
    hasActiveInteraction,
    hasDraftCreation,
    isEnabled,
    onCancelDraftCreation,
    onClearSelection,
    onCloseEditor,
    onCopyBbox,
    onDeleteBbox,
    onPasteBbox,
    onStartEditingBbox,
    selectedBboxId
  ]);
}
