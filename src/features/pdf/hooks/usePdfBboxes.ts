import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import type { AppLanguageMode } from "../../../types/language";
import type { BboxClipboardSnapshot, PdfBbox, PdfBboxRect, PdfPageSize } from "../types/bbox";
import type {
  PageViewerRotationMap,
  RestorePromptState,
  SaveStatus,
  SessionHistoryState,
  SessionPresentState
} from "../types/session";
import { resolvePdfSessionIdentity } from "../utils/pdfSessionIdentity";
import {
  applyHistoryMutation,
  createInitialHistoryState,
  redoHistory,
  undoHistory
} from "./pdfSession/pdfSessionHistory";
import { useBboxMutationActions } from "./pdfSession/useBboxMutationActions";
import { useSessionPersistence } from "./pdfSession/useSessionPersistence";

interface UsePdfBboxesOptions {
  documentMeta: RetrievedPdfMeta | null;
  currentPage: number;
  pageSize: PdfPageSize;
  languageMode: AppLanguageMode;
}

interface MutationOptions {
  mutationKey?: string;
  allowCoalesce?: boolean;
}

export interface UsePdfBboxesResult {
  revision: number;
  bboxes: PdfBbox[];
  currentPageBboxes: PdfBbox[];
  currentPageViewRotationQuarterTurns: number;
  pageViewerRotations: PageViewerRotationMap;
  selectedBboxId: string | null;
  editingBboxId: string | null;
  canPaste: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canSave: boolean;
  canRestoreSession: boolean;
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
  updateBboxTextRotation: (bboxId: string, nextRotationQuarterTurns: number) => void;
  deleteBbox: (bboxId: string) => void;
  registerCustomEntityLabel: (label: string) => void;
  rotateCurrentPageViewClockwise: () => void;
  undo: () => void;
  redo: () => void;
  manualSave: () => Promise<void>;
  openRestoreSessionPrompt: () => void;
  captureExportCheckpoint: () => void;
  markExported: (exportedRevision: number) => void;
  restoreSession: () => void;
  skipRestoreSession: () => void;
}

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
  pageSize,
  languageMode
}: UsePdfBboxesOptions): UsePdfBboxesResult {
  const [history, setHistory] = useState<SessionHistoryState>(() => createInitialHistoryState());
  const [selectedBboxId, setSelectedBboxId] = useState<string | null>(null);
  const [editingBboxId, setEditingBboxId] = useState<string | null>(null);
  const [clipboardSnapshot, setClipboardSnapshot] = useState<BboxClipboardSnapshot | null>(null);

  const idSequenceRef = useRef(0);
  const sessionIdentity = useMemo(() => resolvePdfSessionIdentity(documentMeta), [documentMeta]);

  useEffect(() => {
    idSequenceRef.current = 0;
  }, [sessionIdentity?.key]);

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

        return applyHistoryMutation(previous, withNextRevision(nextBaseState, previous.present.revision), {
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

  const sessionPersistence = useSessionPersistence({
    sessionIdentity,
    currentPage,
    history,
    setHistory,
    setSelectedBboxId,
    setEditingBboxId,
    setClipboardSnapshot
  });

  const mutationActions = useBboxMutationActions({
    hasActiveSession: Boolean(sessionIdentity),
    languageMode,
    currentPage,
    currentPageViewRotationQuarterTurns: sessionPersistence.currentPageViewRotationQuarterTurns,
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
    if (selectedBboxId && !currentPageBboxes.some((bbox) => bbox.id === selectedBboxId)) {
      setSelectedBboxId(null);
    }
  }, [currentPageBboxes, selectedBboxId]);

  useEffect(() => {
    if (editingBboxId && !currentPageBboxes.some((bbox) => bbox.id === editingBboxId)) {
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

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const canSave = Boolean(sessionIdentity) && history.present.revision > 0;
  const hasDirtyChanges = history.present.revision !== sessionPersistence.saveLifecycle.manualSavedRevision;
  const hasUnexportedChanges =
    history.present.bboxes.length > 0 &&
    history.present.revision !== sessionPersistence.saveLifecycle.exportedRevision;
  const hasLossRisk = history.present.bboxes.length > 0 && (hasDirtyChanges || hasUnexportedChanges);

  return {
    revision: history.present.revision,
    bboxes,
    currentPageBboxes,
    currentPageViewRotationQuarterTurns: sessionPersistence.currentPageViewRotationQuarterTurns,
    pageViewerRotations: sessionPersistence.pageViewerRotations,
    selectedBboxId,
    editingBboxId,
    canPaste: mutationActions.canPaste,
    canUndo,
    canRedo,
    canSave,
    canRestoreSession: sessionPersistence.canRestoreSession,
    hasLossRisk,
    saveStatus: sessionPersistence.saveStatus,
    lastAutosaveAt: sessionPersistence.saveLifecycle.lastAutosaveAt,
    lastManualSaveAt: sessionPersistence.saveLifecycle.lastManualSaveAt,
    restorePromptState: sessionPersistence.restorePromptState,
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
    updateBboxTextRotation: mutationActions.updateBboxTextRotation,
    deleteBbox: mutationActions.deleteBbox,
    registerCustomEntityLabel: mutationActions.registerCustomEntityLabel,
    rotateCurrentPageViewClockwise: sessionPersistence.rotateCurrentPageViewClockwise,
    undo,
    redo,
    manualSave: sessionPersistence.manualSave,
    openRestoreSessionPrompt: sessionPersistence.openRestoreSessionPrompt,
    captureExportCheckpoint: sessionPersistence.captureExportCheckpoint,
    markExported: sessionPersistence.markExported,
    restoreSession: sessionPersistence.restoreSession,
    skipRestoreSession: sessionPersistence.skipRestoreSession
  };
}
