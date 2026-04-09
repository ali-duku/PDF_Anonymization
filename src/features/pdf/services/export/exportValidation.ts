import type { PdfExportInput } from "../../types/export";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

export function assertBrowserExportSupport(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new PdfExportError(
      PdfExportErrorCode.BrowserSupport,
      "PDF export is only available in a browser environment."
    );
  }
}

export function assertValidExportInput(input: PdfExportInput): void {
  if (!input.sourcePdfBlob) {
    throw new PdfExportError(PdfExportErrorCode.Validation, "Missing source PDF.");
  }

  if (input.bboxes.length === 0) {
    throw new PdfExportError(PdfExportErrorCode.Validation, "Add at least one bbox before exporting.");
  }

  if (input.languageMode !== "en" && input.languageMode !== "ar") {
    throw new PdfExportError(PdfExportErrorCode.Validation, "Invalid export language mode.");
  }
}
