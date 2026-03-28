import type { PdfRetrievalService } from "../../../../types/services";
import type { PdfExportController } from "../../types/export";
import type { PdfSessionController } from "../../types/session";

export interface PdfWorkspaceProps {
  pdfRetrievalService: PdfRetrievalService;
  onExportControllerChange?: (controller: PdfExportController) => void;
  onSessionControllerChange?: (controller: PdfSessionController) => void;
}
