import { useCallback, useMemo, useState } from "react";
import {
  canRedoHistory,
  canUndoHistory,
  commitHistory,
  createHistoryState,
  redoHistory,
  replacePresentHistory,
  undoHistory
} from "../../utils/history";
import type { HistoryState } from "../../types/history";
import type { OverlayDocument, OverlayEditSession, OverlayLoadPayload } from "../../types/overlay";

interface UseOverlaySessionHistoryResult {
  overlaySession: OverlayEditSession | null;
  canUndoOverlay: boolean;
  canRedoOverlay: boolean;
  canManualSaveOverlay: boolean;
  loadOverlayPayload: (payload: OverlayLoadPayload) => void;
  clearOverlaySession: () => void;
  resetOverlaySessionForDocumentSwitch: () => void;
  saveOverlayDocument: (nextDocument: OverlayDocument) => void;
  markOverlayEditStarted: () => void;
  undoOverlay: () => void;
  redoOverlay: () => void;
  manualSaveOverlay: () => void;
}

function markPresentOverlaySaved(
  history: HistoryState<OverlayEditSession | null>,
  action: string,
  isEqual: (left: OverlayEditSession | null, right: OverlayEditSession | null) => boolean
): HistoryState<OverlayEditSession | null> {
  const present = history.present.state;
  if (!present) {
    return history;
  }

  return replacePresentHistory(
    history,
    {
      ...present,
      saveState: {
        isSaving: false,
        isSaved: true,
        lastSavedAt: new Date().toISOString()
      }
    },
    { action },
    isEqual
  );
}

export function useOverlaySessionHistory(): UseOverlaySessionHistoryResult {
  const [overlayHistory, setOverlayHistory] = useState(() =>
    createHistoryState<OverlayEditSession | null>(null, {
      meta: { action: "init" }
    })
  );

  const overlaySession = overlayHistory.present.state;
  const canUndoOverlay = canUndoHistory(overlayHistory);
  const canRedoOverlay = canRedoHistory(overlayHistory);
  const canManualSaveOverlay = Boolean(overlaySession);

  const areOverlaySessionsEqual = useCallback(
    (left: OverlayEditSession | null, right: OverlayEditSession | null): boolean => {
      if (left === right) {
        return true;
      }

      if (!left || !right) {
        return left === right;
      }

      return (
        left.document === right.document &&
        left.sourceRoot === right.sourceRoot &&
        left.sourceJsonRaw === right.sourceJsonRaw &&
        left.hasViewerChanges === right.hasViewerChanges &&
        left.saveState.isSaving === right.saveState.isSaving &&
        left.saveState.isSaved === right.saveState.isSaved &&
        left.saveState.lastSavedAt === right.saveState.lastSavedAt
      );
    },
    []
  );

  const commitOverlaySession = useCallback(
    (nextSession: OverlayEditSession | null, action: string) => {
      setOverlayHistory((previous) =>
        commitHistory(previous, nextSession, { action }, areOverlaySessionsEqual)
      );
    },
    [areOverlaySessionsEqual]
  );

  const loadOverlayPayload = useCallback(
    (payload: OverlayLoadPayload) => {
      commitOverlaySession(
        {
          ...payload,
          hasViewerChanges: false,
          saveState: {
            isSaving: false,
            isSaved: true,
            lastSavedAt: new Date().toISOString()
          }
        },
        "setup-load-overlays"
      );
    },
    [commitOverlaySession]
  );

  const clearOverlaySession = useCallback(() => {
    commitOverlaySession(null, "setup-clear-overlays");
  }, [commitOverlaySession]);

  const resetOverlaySessionForDocumentSwitch = useCallback(() => {
    setOverlayHistory(
      createHistoryState<OverlayEditSession | null>(null, {
        meta: { action: "viewer-document-switch-reset" }
      })
    );
  }, []);

  const saveOverlayDocument = useCallback(
    (nextDocument: OverlayDocument) => {
      setOverlayHistory((previousHistory) => {
        const previous = previousHistory.present.state;
        if (!previous) {
          return previousHistory;
        }
        return commitHistory(
          previousHistory,
          {
            ...previous,
            document: nextDocument,
            hasViewerChanges: true,
            saveState: {
              isSaving: false,
              isSaved: true,
              lastSavedAt: new Date().toISOString()
            }
          },
          { action: "viewer-overlay-document-saved" },
          areOverlaySessionsEqual
        );
      });
    },
    [areOverlaySessionsEqual]
  );

  const markOverlayEditStarted = useCallback(() => {
    setOverlayHistory((previousHistory) => {
      const previous = previousHistory.present.state;
      if (!previous) {
        return previousHistory;
      }
      return replacePresentHistory(
        previousHistory,
        {
          ...previous,
          saveState: {
            ...previous.saveState,
            isSaving: true,
            isSaved: false
          }
        },
        { action: "viewer-overlay-edit-started" },
        areOverlaySessionsEqual
      );
    });
  }, [areOverlaySessionsEqual]);

  const undoOverlay = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(undoHistory(previous), "history-undo-autosave", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual]);

  const redoOverlay = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(redoHistory(previous), "history-redo-autosave", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual]);

  const manualSaveOverlay = useCallback(() => {
    setOverlayHistory((previous) =>
      markPresentOverlaySaved(previous, "header-manual-save", areOverlaySessionsEqual)
    );
  }, [areOverlaySessionsEqual]);

  return useMemo(
    () => ({
      overlaySession,
      canUndoOverlay,
      canRedoOverlay,
      canManualSaveOverlay,
      loadOverlayPayload,
      clearOverlaySession,
      resetOverlaySessionForDocumentSwitch,
      saveOverlayDocument,
      markOverlayEditStarted,
      undoOverlay,
      redoOverlay,
      manualSaveOverlay
    }),
    [
      canManualSaveOverlay,
      canRedoOverlay,
      canUndoOverlay,
      clearOverlaySession,
      loadOverlayPayload,
      manualSaveOverlay,
      markOverlayEditStarted,
      overlaySession,
      redoOverlay,
      resetOverlaySessionForDocumentSwitch,
      saveOverlayDocument,
      undoOverlay
    ]
  );
}
