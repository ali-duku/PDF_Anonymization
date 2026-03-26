import type { PdfRetrievalService } from "../../../../types/services";
import type { PdfExportController } from "../../types/export";

export interface PdfWorkspaceProps {
  pdfRetrievalService: PdfRetrievalService;
  onExportControllerChange?: (controller: PdfExportController) => void;
}
