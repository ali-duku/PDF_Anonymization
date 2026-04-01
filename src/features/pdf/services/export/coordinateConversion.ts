import type { Rect } from "@embedpdf/models";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

export type ExportRectValidationIssue = "invalid_geometry" | "outside_page_bounds";

function isValidPageSize(pageSize: PdfPageSize): boolean {
  return (
    Number.isFinite(pageSize.width) &&
    Number.isFinite(pageSize.height) &&
    pageSize.width > 0 &&
    pageSize.height > 0
  );
}

function isFiniteRect(rect: PdfBboxRect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height)
  );
}

export function getRectValidationIssue(
  rect: PdfBboxRect,
  pageSize: PdfPageSize
): ExportRectValidationIssue | null {
  if (!isValidPageSize(pageSize) || !isFiniteRect(rect) || rect.width <= 0 || rect.height <= 0) {
    return "invalid_geometry";
  }

  const epsilon = 0.001;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const isInside =
    rect.x >= -epsilon &&
    rect.y >= -epsilon &&
    right <= pageSize.width + epsilon &&
    bottom <= pageSize.height + epsilon;

  return isInside ? null : "outside_page_bounds";
}

export function assertRectWithinPage(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  context: { pageNumber: number; bboxId?: string }
): void {
  const issue = getRectValidationIssue(rect, pageSize);
  if (issue === "invalid_geometry") {
    throw new PdfExportError(PdfExportErrorCode.CoordinateMapping, "Invalid export bbox geometry.", {
      metadata: context
    });
  }

  if (issue === "outside_page_bounds") {
    throw new PdfExportError(PdfExportErrorCode.CoordinateMapping, "A bbox is outside page bounds.", {
      metadata: context
    });
  }
}

export function toEngineRect(rect: PdfBboxRect): Rect {
  return {
    origin: {
      x: rect.x,
      y: rect.y
    },
    size: {
      width: rect.width,
      height: rect.height
    }
  };
}

export function toPdfBottomLeftRect(rect: PdfBboxRect, pageSize: PdfPageSize): PdfBboxRect {
  return {
    x: rect.x,
    y: pageSize.height - (rect.y + rect.height),
    width: rect.width,
    height: rect.height
  };
}
