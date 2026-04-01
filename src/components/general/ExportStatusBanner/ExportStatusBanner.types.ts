import type { PdfExportStatusTone } from "../../../features/pdf/types/export";

export interface ExportStatusBannerProps {
  message?: string;
  tone?: PdfExportStatusTone;
}
