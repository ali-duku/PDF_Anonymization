import type { PdfRetrievalService } from "../../../../types/services";
import type { AppLanguageMode } from "../../../../types/language";
import type { PdfExportController } from "../../types/export";
import type { PdfSessionController } from "../../types/session";

export interface PdfWorkspaceProps {
  languageMode: AppLanguageMode;
  pdfRetrievalService: PdfRetrievalService;
  onExportControllerChange?: (controller: PdfExportController) => void;
  onSessionControllerChange?: (controller: PdfSessionController) => void;
}
