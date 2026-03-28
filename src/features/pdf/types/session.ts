import type { PdfBbox } from "./bbox";

export type SaveStatus = "idle" | "saving" | "saved";

export interface PdfSessionIdentity {
  key: string;
  sourceType: "retrieval";
  fileName: string;
  id: string;
}

export interface SessionPresentState {
  bboxes: PdfBbox[];
  customEntityLabels: string[];
  revision: number;
}

export interface SessionHistoryState {
  past: SessionPresentState[];
  present: SessionPresentState;
  future: SessionPresentState[];
  lastMutationKey: string | null;
}

export interface PersistedSessionMeta {
  identity: PdfSessionIdentity;
  updatedAt: number;
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  autosavedRevision: number;
  manualSavedRevision: number;
  exportedRevision: number;
  lastExportedAt: number | null;
}

export interface PersistedSessionSnapshot {
  meta: PersistedSessionMeta;
  history: SessionHistoryState;
}

export interface PersistedSessionStore {
  schemaVersion: number;
  sessions: Record<string, PersistedSessionSnapshot>;
  updatedAt: number;
}

export interface RestorePromptState {
  isOpen: boolean;
  identityKey: string | null;
  fileName: string;
  bboxCount: number;
  lastSavedAt: number | null;
}

export interface PdfSessionController {
  canSave: boolean;
  saveStatus: SaveStatus;
  lastAutosaveAt: number | null;
  lastManualSaveAt: number | null;
  canUndo: boolean;
  canRedo: boolean;
  hasLossRisk: boolean;
  manualSave: () => Promise<void>;
}
