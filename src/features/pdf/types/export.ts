import type { PdfBbox } from "./bbox";

export interface PdfExportInput {
  sourcePdfBlob: Blob;
  bboxes: readonly PdfBbox[];
  sourceFileName?: string | null;
}

export interface PdfExportOptions {}

export type PdfExportSkippedBboxReason =
  | "outside_page_bounds"
  | "invalid_geometry"
  | "invalid_page_reference";

export interface PdfExportSkippedBbox {
  bboxId: string;
  pageNumber: number;
  reason: PdfExportSkippedBboxReason;
}

export type PdfExportStatusTone = "warning" | "error";

export interface PdfExportResult {
  blob: Blob;
  fileName: string;
  skippedBboxes: readonly PdfExportSkippedBbox[];
}

export interface PdfExportController {
  canExport: boolean;
  isExporting: boolean;
  statusMessage?: string;
  statusTone?: PdfExportStatusTone;
  exportPdf: () => Promise<void>;
}
