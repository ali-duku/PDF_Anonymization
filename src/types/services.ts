import type { JsonGenerationResult } from "./json";
import type { PersistedViewerState, StoredPdfRecord } from "./pdf";

/**
 * Storage contract used by the viewer tab.
 */
export interface StorageService {
  loadPdfRecord(): Promise<StoredPdfRecord | null>;
  savePdfRecord(record: StoredPdfRecord): Promise<void>;
  replacePdf(file: File, initialState: PersistedViewerState): Promise<StoredPdfRecord>;
  loadViewerState(): Promise<PersistedViewerState | null>;
  saveViewerState(state: PersistedViewerState): Promise<void>;
  clearPdfRecord(): Promise<void>;
}

/**
 * JSON workflow contract used by the setup tab.
 */
export interface JsonService {
  generate(rawJson: string): JsonGenerationResult;
  copyToClipboard(text: string): Promise<boolean>;
}
