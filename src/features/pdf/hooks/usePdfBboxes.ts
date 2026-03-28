import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import { AUTOSAVE_DEBOUNCE_MS, SAVE_STATUS_HOLD_MS } from "../constants/session";
import { sessionStorageService } from "../services/sessionStorageService";
import type {
  PersistedSessionSnapshot,
  RestorePromptState,
  SaveStatus,
  SessionHistoryState,
  SessionPresentState
} from "../types/session";
import type { BboxClipboardSnapshot, PdfBbox, PdfBboxRect, PdfPageSize } from "../types/bbox";
import { resolvePdfSessionIdentity } from "../utils/pdfSessionIdentity";
import {
  applyHistoryMutation,
  createInitialHistoryState,
  redoHistory,
  undoHistory
} from "./pdfSession/pdfSessionHistory";
import {
  buildPersistedSessionSnapshot,
  clonePersistedHistory
} from "./pdfSession/pdfSessionPersistence";
import { useBboxMutationActions } from "./pdfSession/useBboxMutationActions";

interface UsePdfBboxesOptions {
  documentMeta: RetrievedPdfMeta | null;
  currentPage: number;
  pageSize: PdfPageSize;
}

interface SaveLifecycleState {
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  autosavedRevision: number;
  manualSavedRevision: number;
  exportedRevision: number;
  lastExportedAt: number | null;
}

interface MutationOptions {
  mutationKey?: string;
  allowCoalesce?: boolean;
}

interface RestoreSessionState {
  prompt: RestorePromptState;
  pendingSnapshot: PersistedSessionSnapshot | null;
}

export interface UsePdfBboxesResult {
  bboxes: PdfBbox[];
  currentPageBboxes: PdfBbox[];
  selectedBboxId: string | null;
  editingBboxId: string | null;
  canPaste: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  hasLossRisk: boolean;
  saveStatus: SaveStatus;
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  restorePromptState: RestorePromptState;
  entityOptions: readonly string[];
  selectBbox: (bboxId: string | null) => void;
  startEditingBbox: (bboxId: string | null) => void;
  createBbox: (rect: PdfBboxRect) => void;
  copyBbox: (bboxId: string) => void;
  duplicateBbox: (bboxId: string) => void;
  pasteClipboardToCurrentPage: () => void;
  updateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
  updateBboxEntityLabel: (bboxId: string, nextLabel: string) => void;
  updateBboxInstanceNumber: (bboxId: string, nextNumber: number | null) => void;
  deleteBbox: (bboxId: string) => void;
  registerCustomEntityLabel: (label: string) => void;
  undo: () => void;
  redo: () => void;
  manualSave: () => Promise<void>;
  markExported: () => void;
  restoreSession: () => void;
  skipRestoreSession: () => void;
}

const INITIAL_SAVE_LIFECYCLE: SaveLifecycleState = {
  lastAutosaveAt: null,
  lastManualSaveAt: null,
  autosavedRevision: 0,
  manualSavedRevision: 0,
  exportedRevision: 0,
  lastExportedAt: null
};

const CLOSED_RESTORE_PROMPT: RestorePromptState = {
  isOpen: false,
  identityKey: null,
  fileName: "",
  bboxCount: 0,
  lastSavedAt: null
};

function buildBboxId(sequence: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bbox-${crypto.randomUUID()}`;
  }

  return `bbox-${Date.now()}-${sequence}`;
}

function withNextRevision(nextState: Omit<SessionPresentState, "revision">, previousRevision: number): SessionPresentState {
  return {
    ...nextState,
    revision: previousRevision + 1
  };
}

export function usePdfBboxes({
  documentMeta,
  currentPage,
  pageSize
}: UsePdfBboxesOptions): UsePdfBboxesResult {
  const [history, setHistory] = useState<SessionHistoryState>(() => createInitialHistoryState());
  const [selectedBboxId, setSelectedBboxId] = useState<string | null>(null);
  const [editingBboxId, setEditingBboxId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveLifecycle, setSaveLifecycle] = useState<SaveLifecycleState>(INITIAL_SAVE_LIFECYCLE);
  const [restoreSessionState, setRestoreSessionState] = useState<RestoreSessionState>({
    prompt: CLOSED_RESTORE_PROMPT,
    pendingSnapshot: null
  });
  const [clipboardSnapshot, setClipboardSnapshot] = useState<BboxClipboardSnapshot | null>(null);

  const idSequenceRef = useRef(0);
  const skippedRestoreKeyRef = useRef<string | null>(null);
  const previousIdentityKeyRef = useRef<string | null>(null);
  const historyRef = useRef(history);
  const saveLifecycleRef = useRef(saveLifecycle);
  const saveStatusResetTimeoutRef = useRef<number | null>(null);
  const saveStatusSequenceRef = useRef(0);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    saveLifecycleRef.current = saveLifecycle;
  }, [saveLifecycle]);

  const sessionIdentity = useMemo(() => resolvePdfSessionIdentity(documentMeta), [documentMeta]);

  const writeSnapshot = useCallback(
    (nextLifecycle: SaveLifecycleState, nextHistory: SessionHistoryState = historyRef.current) => {
      if (!sessionIdentity) {
        return;
      }

      sessionStorageService.writeSnapshot(
        buildPersistedSessionSnapshot({
          identity: sessionIdentity,
          history: nextHistory,
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
    if (
      previousIdentityKeyRef.current !== null &&
      nextIdentityKey !== previousIdentityKeyRef.current
    ) {
      skippedRestoreKeyRef.current = null;
    }
    previousIdentityKeyRef.current = nextIdentityKey;

    idSequenceRef.current = 0;
    setSelectedBboxId(null);
    setEditingBboxId(null);
    setClipboardSnapshot(null);
    setSaveStatus("idle");

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
  }, [sessionIdentity]);

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

      const revisionToPersist = historyRef.current.present.revision;
      const nextLifecycle: SaveLifecycleState = {
        ...saveLifecycleRef.current,
        lastAutosaveAt: Date.now(),
        autosavedRevision: revisionToPersist
      };

      saveLifecycleRef.current = nextLifecycle;
      setSaveLifecycle(nextLifecycle);
      writeSnapshot(nextLifecycle, historyRef.current);
      setSaveStatus("saved");
      scheduleSaveStatusReset();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [history.present.revision, saveLifecycle.autosavedRevision, scheduleSaveStatusReset, sessionIdentity, writeSnapshot]);

  const bboxes = history.present.bboxes;

  const runMutation = useCallback(
    (
      mutator: (present: SessionPresentState) => Omit<SessionPresentState, "revision"> | null,
      options: MutationOptions = {}
    ) => {
      setHistory((previous) => {
        const nextBaseState = mutator(previous.present);
        if (!nextBaseState) {
          return previous;
        }

        const nextState = withNextRevision(nextBaseState, previous.present.revision);
        return applyHistoryMutation(previous, nextState, {
          mutationKey: options.mutationKey,
          allowCoalesce: options.allowCoalesce
        });
      });
    },
    []
  );

  const nextBboxId = useCallback(() => {
    idSequenceRef.current += 1;
    return buildBboxId(idSequenceRef.current);
  }, []);

  const mutationActions = useBboxMutationActions({
    hasActiveSession: Boolean(sessionIdentity),
    currentPage,
    pageSize,
    bboxes,
    customEntityLabels: history.present.customEntityLabels,
    clipboardSnapshot,
    setClipboardSnapshot,
    setSelectedBboxId,
    setEditingBboxId,
    nextBboxId,
    runMutation
  });

  const currentPageBboxes = useMemo(
    () => bboxes.filter((bbox) => bbox.pageNumber === currentPage),
    [bboxes, currentPage]
  );

  useEffect(() => {
    if (!selectedBboxId) {
      return;
    }

    const isVisible = currentPageBboxes.some((bbox) => bbox.id === selectedBboxId);
    if (!isVisible) {
      setSelectedBboxId(null);
    }
  }, [currentPageBboxes, selectedBboxId]);

  useEffect(() => {
    if (!editingBboxId) {
      return;
    }

    const isVisible = currentPageBboxes.some((bbox) => bbox.id === editingBboxId);
    if (!isVisible) {
      setEditingBboxId(null);
    }
  }, [currentPageBboxes, editingBboxId]);

  const selectBbox = useCallback((bboxId: string | null) => {
    setSelectedBboxId(bboxId);
  }, []);

  const startEditingBbox = useCallback((bboxId: string | null) => {
    setEditingBboxId(bboxId);
    if (bboxId) {
      setSelectedBboxId(bboxId);
    }
  }, []);

  const undo = useCallback(() => {
    setHistory((previous) => undoHistory(previous));
    setEditingBboxId(null);
  }, []);

  const redo = useCallback(() => {
    setHistory((previous) => redoHistory(previous));
    setEditingBboxId(null);
  }, []);

  const manualSave = useCallback(async () => {
    if (!sessionIdentity) {
      return;
    }

    const sequence = saveStatusSequenceRef.current + 1;
    saveStatusSequenceRef.current = sequence;
    setSaveStatus("saving");

    const revision = historyRef.current.present.revision;
    const nextLifecycle: SaveLifecycleState = {
      ...saveLifecycleRef.current,
      lastManualSaveAt: Date.now(),
      manualSavedRevision: revision
    };

    saveLifecycleRef.current = nextLifecycle;
    setSaveLifecycle(nextLifecycle);
    writeSnapshot(nextLifecycle, historyRef.current);

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
    writeSnapshot(nextLifecycle, historyRef.current);
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
    const restoredLifecycle: SaveLifecycleState = {
      lastAutosaveAt: snapshot.meta.lastAutosaveAt,
      lastManualSaveAt: snapshot.meta.lastManualSaveAt,
      autosavedRevision: snapshot.meta.autosavedRevision,
      manualSavedRevision: snapshot.meta.manualSavedRevision,
      exportedRevision: snapshot.meta.exportedRevision,
      lastExportedAt: snapshot.meta.lastExportedAt
    };

    setHistory(restoredHistory);
    setSaveLifecycle(restoredLifecycle);
    saveLifecycleRef.current = restoredLifecycle;
    setSelectedBboxId(null);
    setEditingBboxId(null);
    setRestoreSessionState({
      prompt: CLOSED_RESTORE_PROMPT,
      pendingSnapshot: null
    });
  }, [restoreSessionState.pendingSnapshot, sessionIdentity]);

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

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const canSave = Boolean(sessionIdentity) && history.present.revision > 0;
  const hasDirtyChanges = history.present.revision !== saveLifecycle.manualSavedRevision;
  const hasUnexportedChanges =
    history.present.bboxes.length > 0 && history.present.revision !== saveLifecycle.exportedRevision;
  const hasLossRisk = history.present.bboxes.length > 0 && (hasDirtyChanges || hasUnexportedChanges);

  return {
    bboxes,
    currentPageBboxes,
    selectedBboxId,
    editingBboxId,
    canPaste: mutationActions.canPaste,
    canUndo,
    canRedo,
    canSave,
    hasLossRisk,
    saveStatus,
    lastAutosaveAt: saveLifecycle.lastAutosaveAt,
    lastManualSaveAt: saveLifecycle.lastManualSaveAt,
    restorePromptState: restoreSessionState.prompt,
    entityOptions: mutationActions.entityOptions,
    selectBbox,
    startEditingBbox,
    createBbox: mutationActions.createBbox,
    copyBbox: mutationActions.copyBbox,
    duplicateBbox: mutationActions.duplicateBbox,
    pasteClipboardToCurrentPage: mutationActions.pasteClipboardToCurrentPage,
    updateBboxRect: mutationActions.updateBboxRect,
    updateBboxEntityLabel: mutationActions.updateBboxEntityLabel,
    updateBboxInstanceNumber: mutationActions.updateBboxInstanceNumber,
    deleteBbox: mutationActions.deleteBbox,
    registerCustomEntityLabel: mutationActions.registerCustomEntityLabel,
    undo,
    redo,
    manualSave,
    markExported,
    restoreSession,
    skipRestoreSession
  };
}
