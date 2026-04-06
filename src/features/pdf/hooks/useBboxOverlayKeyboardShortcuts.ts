import { useEffect } from "react";
import { PDF_BBOX_OVERLAY_SHORTCUTS } from "../constants/keyboardShortcuts";
import { isEditableEventTarget } from "../utils/editableTarget";
import {
  matchesAnyKeyboardShortcut,
  matchesKeyboardShortcut
} from "../utils/keyboardShortcuts";

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
  onDuplicateBbox: (bboxId: string) => void;
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
  onDuplicateBbox,
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

      // Keep native text-edit shortcuts untouched while label editor or drag interactions are active.
      const canRunSelectedBboxActionShortcut =
        !editingBboxId && !hasDraftCreation && !hasActiveInteraction;
      const isDismissShortcut = matchesKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.dismiss);

      if (
        matchesKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.copy) &&
        selectedBboxId &&
        canRunSelectedBboxActionShortcut
      ) {
        event.preventDefault();
        onCopyBbox(selectedBboxId);
        return;
      }

      if (
        matchesKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.paste) &&
        canPasteBbox &&
        canRunSelectedBboxActionShortcut
      ) {
        event.preventDefault();
        onPasteBbox();
        return;
      }

      if (matchesKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.duplicate)) {
        // Ctrl/Cmd+D is browser-reserved for bookmarking, so app context intentionally wins here.
        event.preventDefault();

        if (selectedBboxId && canRunSelectedBboxActionShortcut) {
          onDuplicateBbox(selectedBboxId);
        }
        return;
      }

      if (isDismissShortcut && hasDraftCreation) {
        event.preventDefault();
        onCancelDraftCreation();
        return;
      }

      if (isDismissShortcut && editingBboxId) {
        event.preventDefault();
        onCloseEditor();
        return;
      }

      if (isDismissShortcut && selectedBboxId) {
        event.preventDefault();
        onClearSelection();
        return;
      }

      if (
        matchesAnyKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.delete) &&
        selectedBboxId &&
        !editingBboxId
      ) {
        event.preventDefault();
        onDeleteBbox(selectedBboxId);
        return;
      }

      if (
        matchesKeyboardShortcut(event, PDF_BBOX_OVERLAY_SHORTCUTS.startEditing) &&
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
    onDuplicateBbox,
    onPasteBbox,
    onStartEditingBbox,
    selectedBboxId
  ]);
}
