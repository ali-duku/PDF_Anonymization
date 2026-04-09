import {
  MAX_PERSISTED_SESSIONS,
  SESSION_STORAGE_KEY,
  SESSION_STORAGE_SCHEMA_VERSION
} from "../constants/session";
import type {
  PersistedSessionSnapshot,
  PersistedSessionStore,
  SessionHistoryState,
  SessionPresentState,
  SessionViewState
} from "../types/session";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value >= 0;
}

function isPresentState(value: unknown): value is SessionPresentState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SessionPresentState;
  return Array.isArray(candidate.bboxes) && Array.isArray(candidate.customEntityLabels) && isFiniteNumber(candidate.revision);
}

function isHistoryState(value: unknown): value is SessionHistoryState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SessionHistoryState;
  return (
    Array.isArray(candidate.past) &&
    candidate.past.every(isPresentState) &&
    isPresentState(candidate.present) &&
    Array.isArray(candidate.future) &&
    candidate.future.every(isPresentState)
  );
}

function isViewState(value: unknown): value is SessionViewState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SessionViewState;
  if (!candidate.pageViewerRotations || typeof candidate.pageViewerRotations !== "object") {
    return false;
  }

  return Object.values(candidate.pageViewerRotations).every((rotation) => isFiniteNumber(rotation));
}

function isPersistedSessionSnapshot(value: unknown): value is PersistedSessionSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PersistedSessionSnapshot;
  const identity = candidate.meta?.identity;
  return Boolean(
    candidate.meta &&
      typeof candidate.meta === "object" &&
      identity &&
      typeof identity === "object" &&
      typeof identity.key === "string" &&
      typeof identity.fileName === "string" &&
      (identity.sourceType === "retrieval" || identity.sourceType === "upload") &&
      typeof identity.id === "string" &&
      isFiniteNumber(candidate.meta.updatedAt) &&
      isNullableFiniteNumber(candidate.meta.lastAutosaveAt) &&
      isNullableFiniteNumber(candidate.meta.lastManualSaveAt) &&
      isNullableFiniteNumber(candidate.meta.lastExportedAt) &&
      isNonNegativeInteger(candidate.meta.autosavedRevision) &&
      isNonNegativeInteger(candidate.meta.manualSavedRevision) &&
      isNonNegativeInteger(candidate.meta.exportedRevision) &&
      isHistoryState(candidate.history) &&
      (!candidate.viewState || isViewState(candidate.viewState))
  );
}

function buildEmptyStore(): PersistedSessionStore {
  return {
    schemaVersion: SESSION_STORAGE_SCHEMA_VERSION,
    sessions: {},
    updatedAt: Date.now()
  };
}

function normalizeStore(rawStore: unknown): PersistedSessionStore {
  if (!rawStore || typeof rawStore !== "object") {
    return buildEmptyStore();
  }

  const candidate = rawStore as PersistedSessionStore;
  if (candidate.schemaVersion !== SESSION_STORAGE_SCHEMA_VERSION || !candidate.sessions) {
    return buildEmptyStore();
  }

  const normalizedSessions: Record<string, PersistedSessionSnapshot> = {};
  for (const [key, snapshot] of Object.entries(candidate.sessions)) {
    if (isPersistedSessionSnapshot(snapshot) && snapshot.meta.identity.key === key) {
      normalizedSessions[key] = snapshot;
    }
  }

  return {
    schemaVersion: SESSION_STORAGE_SCHEMA_VERSION,
    sessions: normalizedSessions,
    updatedAt: isFiniteNumber(candidate.updatedAt) ? candidate.updatedAt : Date.now()
  };
}

function readStore(): PersistedSessionStore {
  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return buildEmptyStore();
    }

    return normalizeStore(JSON.parse(rawValue));
  } catch {
    return buildEmptyStore();
  }
}

function pruneSessions(sessions: Record<string, PersistedSessionSnapshot>) {
  const entries = Object.entries(sessions);
  if (entries.length <= MAX_PERSISTED_SESSIONS) {
    return sessions;
  }

  const sorted = entries.sort(([, left], [, right]) => right.meta.updatedAt - left.meta.updatedAt);
  return Object.fromEntries(sorted.slice(0, MAX_PERSISTED_SESSIONS));
}

function writeStore(store: PersistedSessionStore): void {
  try {
    const nextStore: PersistedSessionStore = {
      schemaVersion: SESSION_STORAGE_SCHEMA_VERSION,
      sessions: pruneSessions(store.sessions),
      updatedAt: Date.now()
    };

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextStore));
  } catch {
    // Gracefully degrade when storage is unavailable.
  }
}

export const sessionStorageService = {
  readSnapshot(identityKey: string): PersistedSessionSnapshot | null {
    if (!identityKey) {
      return null;
    }

    const store = readStore();
    return store.sessions[identityKey] ?? null;
  },

  writeSnapshot(snapshot: PersistedSessionSnapshot): void {
    // Snapshots intentionally contain only app/session metadata and bbox state, never PDF bytes.
    const store = readStore();
    store.sessions[snapshot.meta.identity.key] = snapshot;
    writeStore(store);
  }
};
