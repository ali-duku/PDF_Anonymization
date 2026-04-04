import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AUTOSAVE_DEBOUNCE_MS, SAVE_STATUS_HOLD_MS } from "../../constants/session";
import {
  DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS,
  PAGE_VIEW_ROTATION_STEP
} from "../../constants/pageView";
import { sessionStorageService } from "../../services/sessionStorageService";
import type { SaveStatus, SessionHistoryState, SessionViewState } from "../../types/session";
import { normalizePageViewRotationQuarterTurns } from "../../utils/pageViewTransform";
import { createInitialHistoryState } from "./pdfSessionHistory";
import {
  buildPersistedSessionSnapshot,
  clonePersistedHistory,
  clonePersistedViewState
} from "./pdfSessionPersistence";
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
    },
    [sessionIdentity]
  );
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
      setRestoreSessionState({
        prompt: CLOSED_RESTORE_PROMPT,
        pendingSnapshot: null
      });
      return;
    }
    const persistedSnapshot = sessionStorageService.readSnapshot(sessionIdentity.key);
    const hasRestorableWork = Boolean(persistedSnapshot && persistedSnapshot.history.present.bboxes.length > 0);
    const shouldPromptRestore = hasRestorableWork && skippedRestoreKeyRef.current !== sessionIdentity.key;
    setHistory(createInitialHistoryState());
    setSaveLifecycle(INITIAL_SAVE_LIFECYCLE);
    if (shouldPromptRestore && persistedSnapshot) {
      setRestoreSessionState({
        prompt: {
          isOpen: true,
          identityKey: sessionIdentity.key,
          fileName: persistedSnapshot.meta.identity.fileName,
          bboxCount: persistedSnapshot.history.present.bboxes.length,
          lastSavedAt: persistedSnapshot.meta.lastAutosaveAt ?? persistedSnapshot.meta.lastManualSaveAt
        },
        pendingSnapshot: persistedSnapshot
      });
      return;
    }
    setRestoreSessionState({
      prompt: CLOSED_RESTORE_PROMPT,
      pendingSnapshot: null
    });
  }, [sessionIdentity, setClipboardSnapshot, setEditingBboxId, setHistory, setSelectedBboxId]);
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
  const markExported = useCallback(() => {
    if (!sessionIdentity) {
      return;
    }
    const nextLifecycle: SaveLifecycleState = {
      ...saveLifecycleRef.current,
      exportedRevision: historyRef.current.present.revision,
      lastExportedAt: Date.now()
    };
    saveLifecycleRef.current = nextLifecycle;
    setSaveLifecycle(nextLifecycle);
    writeSnapshot(nextLifecycle);
  }, [sessionIdentity, writeSnapshot]);
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
    const restoredLifecycle: SaveLifecycleState = {
      lastAutosaveAt: snapshot.meta.lastAutosaveAt,
      lastManualSaveAt: snapshot.meta.lastManualSaveAt,
      autosavedRevision: snapshot.meta.autosavedRevision,
      manualSavedRevision: snapshot.meta.manualSavedRevision,
      exportedRevision: snapshot.meta.exportedRevision,
      lastExportedAt: snapshot.meta.lastExportedAt
    };
    setHistory(restoredHistory);
    setViewState(restoredViewState);
    viewStateRef.current = restoredViewState;
    setSaveLifecycle(restoredLifecycle);
    saveLifecycleRef.current = restoredLifecycle;
    setSelectedBboxId(null);
    setEditingBboxId(null);
    setRestoreSessionState({
      prompt: CLOSED_RESTORE_PROMPT,
      pendingSnapshot: null
    });
  }, [restoreSessionState.pendingSnapshot, sessionIdentity, setEditingBboxId, setHistory, setSelectedBboxId]);
  const skipRestoreSession = useCallback(() => {
    const identityKey = restoreSessionState.prompt.identityKey;
    if (identityKey) {
      skippedRestoreKeyRef.current = identityKey;
    }
    setRestoreSessionState({
      prompt: CLOSED_RESTORE_PROMPT,
      pendingSnapshot: null
    });
  }, [restoreSessionState.prompt.identityKey]);
  const currentPageViewRotationQuarterTurns = normalizePageViewRotationQuarterTurns(
    viewState.pageViewerRotations[currentPage] ?? DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS
  );
  const rotateCurrentPageViewClockwise = useCallback(() => {
    if (!sessionIdentity || !Number.isFinite(currentPage) || currentPage <= 0) {
      return;
    }
    setViewState((previous) => {
      const previousRotation = normalizePageViewRotationQuarterTurns(
        previous.pageViewerRotations[currentPage] ?? DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS
      );
      const nextRotation = normalizePageViewRotationQuarterTurns(previousRotation + PAGE_VIEW_ROTATION_STEP);
      const nextPageViewerRotations = { ...previous.pageViewerRotations };
      if (nextRotation === DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS) {
        delete nextPageViewerRotations[currentPage];
      } else {
        nextPageViewerRotations[currentPage] = nextRotation;
      }
      const nextViewState: SessionViewState = {
        pageViewerRotations: nextPageViewerRotations
      };
      viewStateRef.current = nextViewState;
      writeSnapshot(saveLifecycleRef.current, historyRef.current, nextViewState);
      return nextViewState;
    });
  }, [currentPage, sessionIdentity, writeSnapshot]);
  return useMemo(
    () => ({
      saveStatus,
      saveLifecycle,
      restorePromptState: restoreSessionState.prompt,
      pageViewerRotations: viewState.pageViewerRotations,
      currentPageViewRotationQuarterTurns,
      manualSave,
      markExported,
      restoreSession,
      skipRestoreSession,
      rotateCurrentPageViewClockwise
    }),
    [
      currentPageViewRotationQuarterTurns,
      manualSave,
      markExported,
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
