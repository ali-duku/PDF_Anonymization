import type { Dispatch, SetStateAction } from "react";
import type { BboxClipboardSnapshot } from "../../types/bbox";
import type {
  PageViewerRotationMap,
  PersistedSessionSnapshot,
  PdfSessionIdentity,
  RestorePromptState,
  SaveStatus,
  SessionHistoryState,
  SessionViewState
} from "../../types/session";

export interface SaveLifecycleState {
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  autosavedRevision: number;
  manualSavedRevision: number;
  exportedRevision: number;
  lastExportedAt: number | null;
}

export interface RestoreSessionState {
  prompt: RestorePromptState;
  pendingSnapshot: PersistedSessionSnapshot | null;
}

export interface UseSessionPersistenceOptions {
  sessionIdentity: PdfSessionIdentity | null;
  currentPage: number;
  history: SessionHistoryState;
  setHistory: Dispatch<SetStateAction<SessionHistoryState>>;
  setSelectedBboxId: Dispatch<SetStateAction<string | null>>;
  setEditingBboxId: Dispatch<SetStateAction<string | null>>;
  setClipboardSnapshot: Dispatch<SetStateAction<BboxClipboardSnapshot | null>>;
}

export interface UseSessionPersistenceResult {
  saveStatus: SaveStatus;
  saveLifecycle: SaveLifecycleState;
  canRestoreSession: boolean;
  restorePromptState: RestorePromptState;
  pageViewerRotations: PageViewerRotationMap;
  currentPageViewRotationQuarterTurns: number;
  manualSave: () => Promise<void>;
  openRestoreSessionPrompt: () => void;
  captureExportCheckpoint: () => void;
  markExported: (exportedRevision: number) => void;
  restoreSession: () => void;
  skipRestoreSession: () => void;
  rotateCurrentPageViewClockwise: () => void;
}

export const INITIAL_SAVE_LIFECYCLE: SaveLifecycleState = {
  lastAutosaveAt: null,
  lastManualSaveAt: null,
  autosavedRevision: 0,
  manualSavedRevision: 0,
  exportedRevision: 0,
  lastExportedAt: null
};

export const CLOSED_RESTORE_PROMPT: RestorePromptState = {
  isOpen: false,
  identityKey: null,
  fileName: "",
  bboxCount: 0,
  lastSavedAt: null
};

export const INITIAL_VIEW_STATE: SessionViewState = {
  pageViewerRotations: {}
};
