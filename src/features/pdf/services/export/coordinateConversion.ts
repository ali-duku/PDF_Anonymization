import type { Rect } from "@embedpdf/models";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

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

export function assertRectWithinPage(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  context: { pageNumber: number; bboxId?: string }
): void {
  if (!isValidPageSize(pageSize) || !isFiniteRect(rect) || rect.width <= 0 || rect.height <= 0) {
    throw new PdfExportError(PdfExportErrorCode.CoordinateMapping, "Invalid export bbox geometry.", {
      metadata: context
    });
  }

  const epsilon = 0.001;
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const isInside =
    rect.x >= -epsilon &&
    rect.y >= -epsilon &&
    right <= pageSize.width + epsilon &&
    bottom <= pageSize.height + epsilon;

  if (!isInside) {
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
