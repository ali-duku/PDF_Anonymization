import type { PdfExportInput } from "../../types/export";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

  for (const bbox of input.bboxes) {
    const hasValidRect =
      isFiniteNumber(bbox.x) &&
      isFiniteNumber(bbox.y) &&
      isFiniteNumber(bbox.width) &&
      isFiniteNumber(bbox.height) &&
      bbox.width > 0 &&
      bbox.height > 0;

    if (!hasValidRect || !Number.isInteger(bbox.pageNumber) || bbox.pageNumber < 1) {
      throw new PdfExportError(PdfExportErrorCode.Validation, "One or more bboxes are invalid.");
    }
  }
}
