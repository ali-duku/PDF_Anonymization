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

export function toPageQuarterTurns(rotation: number): number {
  if (!Number.isFinite(rotation)) {
    return 0;
  }

  if (Math.abs(rotation) >= 4) {
    const normalizedDegrees = ((Math.trunc(rotation) % 360) + 360) % 360;
    return Math.round(normalizedDegrees / 90) % 4;
  }

  return ((Math.trunc(rotation) % 4) + 4) % 4;
}

export function getDevicePageSize(pageSize: PdfPageSize, pageQuarterTurns = 0): PdfPageSize {
  const normalizedQuarterTurns = toPageQuarterTurns(pageQuarterTurns);
  const isQuarterTurn = normalizedQuarterTurns === 1 || normalizedQuarterTurns === 3;

  return isQuarterTurn
    ? {
        width: pageSize.height,
        height: pageSize.width
      }
    : pageSize;
}

export function toPdfPagePointFromDevicePoint(
  pageSize: PdfPageSize,
  pageQuarterTurns: number,
  x: number,
  y: number
): { x: number; y: number } {
  const normalizedQuarterTurns = toPageQuarterTurns(pageQuarterTurns);
  // Keep conversion consistent with PDFium's device->page mapping:
  // for quarter turns, conversion uses the rotated/device page dimensions.
  const devicePageSize = getDevicePageSize(pageSize, normalizedQuarterTurns);
  const deviceWidth = devicePageSize.width;
  const deviceHeight = devicePageSize.height;

  if (normalizedQuarterTurns === 0) {
    return { x, y: deviceHeight - y };
  }

  if (normalizedQuarterTurns === 1) {
    return { x: y, y: x };
  }

  if (normalizedQuarterTurns === 2) {
    return { x: deviceWidth - x, y };
  }

  return { x: deviceHeight - y, y: deviceWidth - x };
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

export function toPdfPageRectFromDeviceRect(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  pageQuarterTurns = 0
): PdfBboxRect {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;

  const topLeft = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, x0, y0);
  const topRight = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, x1, y0);
  const bottomRight = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, x1, y1);
  const bottomLeft = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, x0, y1);

  const left = Math.min(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
  const right = Math.max(topLeft.x, topRight.x, bottomRight.x, bottomLeft.x);
  const bottom = Math.min(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y);
  const top = Math.max(topLeft.y, topRight.y, bottomRight.y, bottomLeft.y);

  return {
    x: left,
    y: bottom,
    width: Math.max(right - left, 0),
    height: Math.max(top - bottom, 0)
  };
}

export function toPdfBottomLeftRect(rect: PdfBboxRect, pageSize: PdfPageSize): PdfBboxRect {
  return toPdfPageRectFromDeviceRect(rect, pageSize, 0);
}
