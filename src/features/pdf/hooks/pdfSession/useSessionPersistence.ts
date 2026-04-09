import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTOSAVE_DEBOUNCE_MS, SAVE_STATUS_HOLD_MS } from "../../constants/session";
import { sessionStorageService } from "../../services/sessionStorageService";
import type {
  SaveStatus,
  SessionHistoryState,
  SessionViewState
} from "../../types/session";
import { createInitialHistoryState } from "./pdfSessionHistory";
import {
  buildPersistedSessionSnapshot,
  clonePersistedHistory,
  clonePersistedViewState
} from "./pdfSessionPersistence";
import {
  buildClosedRestoreSessionState,
  buildOpenRestoreSessionState,
  buildRestoredSaveLifecycle,
  hasRestorableSnapshot
} from "./sessionRestoreHelpers";
import {
  buildRotatedViewState,
  resolveCurrentPageViewRotation
} from "./sessionViewStateHelpers";
import {
  CLOSED_RESTORE_PROMPT,
  INITIAL_SAVE_LIFECYCLE,
  INITIAL_VIEW_STATE,
  type RestoreSessionState,
  type SaveLifecycleState,
  type UseSessionPersistenceOptions,
  type UseSessionPersistenceResult
} from "./useSessionPersistence.types";
export function useSessionPersistence({
  sessionIdentity,
  currentPage,
  history,
  setHistory,
  setSelectedBboxId,
  setEditingBboxId,
  setClipboardSnapshot
}: UseSessionPersistenceOptions): UseSessionPersistenceResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveLifecycle, setSaveLifecycle] = useState<SaveLifecycleState>(INITIAL_SAVE_LIFECYCLE);
  const [viewState, setViewState] = useState<SessionViewState>(INITIAL_VIEW_STATE);
  const [canRestoreSession, setCanRestoreSession] = useState(false);
  const [restoreSessionState, setRestoreSessionState] = useState<RestoreSessionState>({
    prompt: CLOSED_RESTORE_PROMPT,
    pendingSnapshot: null
  });
  const skippedRestoreKeyRef = useRef<string | null>(null);
  const previousIdentityKeyRef = useRef<string | null>(null);
  const historyRef = useRef(history);
  const saveLifecycleRef = useRef(saveLifecycle);
  const viewStateRef = useRef(viewState);
  const saveStatusResetTimeoutRef = useRef<number | null>(null);
  const saveStatusSequenceRef = useRef(0);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    saveLifecycleRef.current = saveLifecycle;
  }, [saveLifecycle]);
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);
  const writeSnapshot = useCallback(
    (
      nextLifecycle: SaveLifecycleState,
      nextHistory: SessionHistoryState = historyRef.current,
      nextViewState: SessionViewState = viewStateRef.current
    ) => {
      if (!sessionIdentity) {
        return;
      }
      sessionStorageService.writeSnapshot(
        buildPersistedSessionSnapshot({
          identity: sessionIdentity,
          history: nextHistory,
          viewState: nextViewState,
          ...nextLifecycle
        })
      );
      setCanRestoreSession(nextHistory.present.bboxes.length > 0);
    },
    [sessionIdentity]
  );
  const readRestorableSnapshot = useCallback(() => {
    if (!sessionIdentity) {
      return null;
    }
    const persistedSnapshot = sessionStorageService.readSnapshot(sessionIdentity.key);
    if (!hasRestorableSnapshot(persistedSnapshot, sessionIdentity.key)) {
      return null;
    }
    return persistedSnapshot;
  }, [sessionIdentity]);
  const scheduleSaveStatusReset = useCallback(() => {
    if (saveStatusResetTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusResetTimeoutRef.current);
    }
    saveStatusResetTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus("idle");
    }, SAVE_STATUS_HOLD_MS);
  }, []);
  useEffect(() => {
    return () => {
      if (saveStatusResetTimeoutRef.current !== null) {
        window.clearTimeout(saveStatusResetTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    const nextIdentityKey = sessionIdentity?.key ?? null;
    if (previousIdentityKeyRef.current !== null && nextIdentityKey !== previousIdentityKeyRef.current) {
      skippedRestoreKeyRef.current = null;
    }
    previousIdentityKeyRef.current = nextIdentityKey;
    setSelectedBboxId(null);
    setEditingBboxId(null);
    setClipboardSnapshot(null);
    setSaveStatus("idle");
    setViewState(INITIAL_VIEW_STATE);
    viewStateRef.current = INITIAL_VIEW_STATE;
    if (!sessionIdentity) {
      setHistory(createInitialHistoryState());
      setSaveLifecycle(INITIAL_SAVE_LIFECYCLE);
      setCanRestoreSession(false);
      setRestoreSessionState(buildClosedRestoreSessionState());
      return;
    }
    const persistedSnapshot = readRestorableSnapshot();
    const hasRestorableWork = Boolean(persistedSnapshot);
    const shouldPromptRestore = hasRestorableWork && skippedRestoreKeyRef.current !== sessionIdentity.key;
    setHistory(createInitialHistoryState());
    setSaveLifecycle(INITIAL_SAVE_LIFECYCLE);
    setCanRestoreSession(hasRestorableWork);
    if (shouldPromptRestore && persistedSnapshot) {
      setRestoreSessionState(buildOpenRestoreSessionState(sessionIdentity.key, persistedSnapshot));
      return;
    }
    setRestoreSessionState(buildClosedRestoreSessionState());
  }, [readRestorableSnapshot, sessionIdentity, setClipboardSnapshot, setEditingBboxId, setHistory, setSelectedBboxId]);
  useEffect(() => {
    if (!sessionIdentity) {
      return;
    }
    const hasMutations = history.present.revision > 0;
    if (!hasMutations || history.present.revision === saveLifecycle.autosavedRevision) {
      return;
    }
    const sequence = saveStatusSequenceRef.current + 1;
    saveStatusSequenceRef.current = sequence;
    setSaveStatus("saving");
    const timeoutId = window.setTimeout(() => {
      if (sequence !== saveStatusSequenceRef.current) {
        return;
      }
      const nextLifecycle: SaveLifecycleState = {
        ...saveLifecycleRef.current,
        lastAutosaveAt: Date.now(),
        autosavedRevision: historyRef.current.present.revision
      };
      saveLifecycleRef.current = nextLifecycle;
      setSaveLifecycle(nextLifecycle);
      writeSnapshot(nextLifecycle);
      setSaveStatus("saved");
      scheduleSaveStatusReset();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [history.present.revision, saveLifecycle.autosavedRevision, scheduleSaveStatusReset, sessionIdentity, writeSnapshot]);
  const manualSave = useCallback(async () => {
    if (!sessionIdentity) {
      return;
    }
    const sequence = saveStatusSequenceRef.current + 1;
    saveStatusSequenceRef.current = sequence;
    setSaveStatus("saving");
    const nextLifecycle: SaveLifecycleState = {
      ...saveLifecycleRef.current,
      lastManualSaveAt: Date.now(),
      manualSavedRevision: historyRef.current.present.revision
    };
    saveLifecycleRef.current = nextLifecycle;
    setSaveLifecycle(nextLifecycle);
    writeSnapshot(nextLifecycle);
    setSaveStatus("saved");
    scheduleSaveStatusReset();
  }, [scheduleSaveStatusReset, sessionIdentity, writeSnapshot]);
  const captureExportCheckpoint = useCallback(() => {
    if (!sessionIdentity) {
      return;
    }
    writeSnapshot(saveLifecycleRef.current, historyRef.current, viewStateRef.current);
  }, [sessionIdentity, writeSnapshot]);
  const markExported = useCallback((exportedRevision: number) => {
    if (!sessionIdentity) {
      return;
    }
    const safeExportedRevision =
      Number.isFinite(exportedRevision) && exportedRevision >= 0
        ? Math.trunc(exportedRevision)
        : historyRef.current.present.revision;
    const nextLifecycle: SaveLifecycleState = {
      ...saveLifecycleRef.current,
      exportedRevision: Math.max(saveLifecycleRef.current.exportedRevision, safeExportedRevision),
      lastExportedAt: Date.now()
    };
    saveLifecycleRef.current = nextLifecycle;
    setSaveLifecycle(nextLifecycle);
    writeSnapshot(nextLifecycle);
  }, [sessionIdentity, writeSnapshot]);
  const openRestoreSessionPrompt = useCallback(() => {
    if (!sessionIdentity) {
      return;
    }
    const snapshot = readRestorableSnapshot();
    if (!snapshot) {
      setCanRestoreSession(false);
      return;
    }
    setCanRestoreSession(true);
    setRestoreSessionState(buildOpenRestoreSessionState(sessionIdentity.key, snapshot));
  }, [readRestorableSnapshot, sessionIdentity]);
  const restoreSession = useCallback(() => {
    if (!restoreSessionState.pendingSnapshot || !sessionIdentity) {
      return;
    }
    const snapshot = restoreSessionState.pendingSnapshot;
    if (snapshot.meta.identity.key !== sessionIdentity.key) {
      return;
    }
    const restoredHistory = clonePersistedHistory(snapshot.history);
    const restoredViewState = clonePersistedViewState(snapshot.viewState);
    const restoredLifecycle = buildRestoredSaveLifecycle(snapshot);
    setHistory(restoredHistory);
    setViewState(restoredViewState);
    viewStateRef.current = restoredViewState;
    setSaveLifecycle(restoredLifecycle);
    saveLifecycleRef.current = restoredLifecycle;
    setSelectedBboxId(null);
    setEditingBboxId(null);
    setRestoreSessionState(buildClosedRestoreSessionState());
  }, [restoreSessionState.pendingSnapshot, sessionIdentity, setEditingBboxId, setHistory, setSelectedBboxId]);
  const skipRestoreSession = useCallback(() => {
    const identityKey = restoreSessionState.prompt.identityKey;
    if (identityKey) {
      skippedRestoreKeyRef.current = identityKey;
    }
    setRestoreSessionState(buildClosedRestoreSessionState());
    setCanRestoreSession(Boolean(sessionIdentity));
  }, [restoreSessionState.prompt.identityKey, sessionIdentity]);
  const currentPageViewRotationQuarterTurns = resolveCurrentPageViewRotation(viewState, currentPage);
  const rotateCurrentPageViewClockwise = useCallback(() => {
    if (!sessionIdentity || !Number.isFinite(currentPage) || currentPage <= 0) {
      return;
    }
    setViewState((previous) => {
      const nextViewState = buildRotatedViewState(previous, currentPage);
      viewStateRef.current = nextViewState;
      writeSnapshot(saveLifecycleRef.current, historyRef.current, nextViewState);
      return nextViewState;
    });
  }, [currentPage, sessionIdentity, writeSnapshot]);
  return useMemo(
    () => ({
      saveStatus,
      saveLifecycle,
      canRestoreSession,
      restorePromptState: restoreSessionState.prompt,
      pageViewerRotations: viewState.pageViewerRotations,
      currentPageViewRotationQuarterTurns,
      manualSave,
      openRestoreSessionPrompt,
      captureExportCheckpoint,
      markExported,
      restoreSession,
      skipRestoreSession,
      rotateCurrentPageViewClockwise
    }),
    [
      canRestoreSession,
      captureExportCheckpoint,
      currentPageViewRotationQuarterTurns,
      manualSave,
      markExported,
      openRestoreSessionPrompt,
      restoreSession,
      restoreSessionState.prompt,
      rotateCurrentPageViewClockwise,
      saveLifecycle,
      saveStatus,
      skipRestoreSession,
      viewState.pageViewerRotations
    ]
  );
}
