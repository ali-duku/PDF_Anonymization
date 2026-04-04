import { PERSISTED_HISTORY_LIMIT } from "../../constants/session";
import type {
  SessionViewState,
  PersistedSessionSnapshot,
  PdfSessionIdentity,
  SessionHistoryState,
  SessionPresentState
} from "../../types/session";
import { normalizePdfBboxState } from "../../utils/bboxState";
import { normalizePotentialMojibakeText } from "../../utils/textEncoding";

export interface SessionPersistenceStateInput {
  identity: PdfSessionIdentity;
  history: SessionHistoryState;
  viewState: SessionViewState;
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  autosavedRevision: number;
  manualSavedRevision: number;
  exportedRevision: number;
  lastExportedAt: number | null;
}

function clonePresentState(state: SessionPresentState): SessionPresentState {
  return {
    bboxes: state.bboxes.map((bbox) => normalizePdfBboxState({ ...bbox })),
    customEntityLabels: state.customEntityLabels.map((label) => normalizePotentialMojibakeText(label)),
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

export function clonePersistedViewState(viewState?: SessionViewState): SessionViewState {
  return {
    pageViewerRotations: { ...viewState?.pageViewerRotations }
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
    history: cloneHistoryState(input.history),
    viewState: clonePersistedViewState(input.viewState)
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
