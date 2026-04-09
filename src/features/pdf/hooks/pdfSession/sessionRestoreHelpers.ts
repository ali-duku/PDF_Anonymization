import type { PersistedSessionSnapshot } from "../../types/session";
import {
  CLOSED_RESTORE_PROMPT,
  type RestoreSessionState,
  type SaveLifecycleState
} from "./useSessionPersistence.types";

export function resolveSnapshotLastSavedAt(snapshot: PersistedSessionSnapshot): number | null {
  const candidates = [snapshot.meta.lastAutosaveAt, snapshot.meta.lastManualSaveAt].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

export function hasRestorableSnapshot(snapshot: PersistedSessionSnapshot | null, identityKey: string): boolean {
  return Boolean(snapshot && snapshot.meta.identity.key === identityKey && snapshot.history.present.bboxes.length > 0);
}

export function buildOpenRestoreSessionState(
  identityKey: string,
  snapshot: PersistedSessionSnapshot
): RestoreSessionState {
  return {
    prompt: {
      isOpen: true,
      identityKey,
      fileName: snapshot.meta.identity.fileName,
      bboxCount: snapshot.history.present.bboxes.length,
      lastSavedAt: resolveSnapshotLastSavedAt(snapshot)
    },
    pendingSnapshot: snapshot
  };
}

export function buildClosedRestoreSessionState(): RestoreSessionState {
  return {
    prompt: CLOSED_RESTORE_PROMPT,
    pendingSnapshot: null
  };
}

export function buildRestoredSaveLifecycle(snapshot: PersistedSessionSnapshot): SaveLifecycleState {
  return {
    lastAutosaveAt: snapshot.meta.lastAutosaveAt,
    lastManualSaveAt: snapshot.meta.lastManualSaveAt,
    autosavedRevision: snapshot.meta.autosavedRevision,
    manualSavedRevision: snapshot.meta.manualSavedRevision,
    exportedRevision: snapshot.meta.exportedRevision,
    lastExportedAt: snapshot.meta.lastExportedAt
  };
}
