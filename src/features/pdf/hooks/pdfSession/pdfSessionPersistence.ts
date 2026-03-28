import { PERSISTED_HISTORY_LIMIT } from "../../constants/session";
import type {
  PersistedSessionSnapshot,
  PdfSessionIdentity,
  SessionHistoryState,
  SessionPresentState
} from "../../types/session";

export interface SessionPersistenceStateInput {
  identity: PdfSessionIdentity;
  history: SessionHistoryState;
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  autosavedRevision: number;
  manualSavedRevision: number;
  exportedRevision: number;
  lastExportedAt: number | null;
}

function clonePresentState(state: SessionPresentState): SessionPresentState {
  return {
    bboxes: state.bboxes.map((bbox) => ({ ...bbox })),
    customEntityLabels: [...state.customEntityLabels],
    revision: state.revision
  };
}

function cloneHistoryState(history: SessionHistoryState): SessionHistoryState {
  return {
    past: history.past.slice(-PERSISTED_HISTORY_LIMIT).map(clonePresentState),
    present: clonePresentState(history.present),
    future: history.future.slice(0, PERSISTED_HISTORY_LIMIT).map(clonePresentState),
    lastMutationKey: null
  };
}

export function buildPersistedSessionSnapshot(
  input: SessionPersistenceStateInput
): PersistedSessionSnapshot {
  return {
    meta: {
      identity: input.identity,
      updatedAt: Date.now(),
      lastAutosaveAt: input.lastAutosaveAt,
      lastManualSaveAt: input.lastManualSaveAt,
      autosavedRevision: input.autosavedRevision,
      manualSavedRevision: input.manualSavedRevision,
      exportedRevision: input.exportedRevision,
      lastExportedAt: input.lastExportedAt
    },
    history: cloneHistoryState(input.history)
  };
}

export function clonePersistedHistory(history: SessionHistoryState): SessionHistoryState {
  return {
    past: history.past.map(clonePresentState),
    present: clonePresentState(history.present),
    future: history.future.map(clonePresentState),
    lastMutationKey: null
  };
}
