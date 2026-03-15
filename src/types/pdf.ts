export type PdfLoadStatus = "idle" | "loading" | "ready" | "error";

/**
 * Persisted page and zoom values for continuity across sessions.
 */
export interface PersistedViewerState {
  currentPage: number;
  zoom: number;
}

/**
 * Runtime viewer state used by UI controls and status indicators.
 */
export interface PdfViewerState extends PersistedViewerState {
  totalPages: number;
  loadStatus: PdfLoadStatus;
  errorMessage?: string;
}

/**
 * IndexedDB record for the latest uploaded PDF.
 */
export interface StoredPdfRecord {
  id: "last-uploaded-pdf";
  fileName: string;
  fileType: string;
  fileSize: number;
  updatedAt: string;
  pdfBlob: Blob;
  viewerState: PersistedViewerState;
}
