import type { PdfBbox } from "./bbox";

export interface PdfExportInput {
  sourcePdfBlob: Blob;
  bboxes: readonly PdfBbox[];
  sourceFileName?: string | null;
}

export interface PdfExportOptions {}

export interface PdfExportResult {
  blob: Blob;
  fileName: string;
}

export interface PdfExportController {
  canExport: boolean;
  isExporting: boolean;
  errorMessage?: string;
  exportPdf: () => Promise<void>;
}
