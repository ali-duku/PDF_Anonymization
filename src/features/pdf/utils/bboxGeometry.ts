import { BBOX_LABEL_SEPARATOR, BBOX_MIN_SIZE } from "../constants/bbox";
import { formatArabicIndicDigits } from "./arabicNumerals";
import type {
  BboxDisplayRect,
  BboxResizeHandle,
  PdfBboxRect,
  PdfPageSize
} from "../types/bbox";

export interface PagePoint {
  x: number;
  y: number;
}

const ZERO_MIN_SIZE = Object.freeze({
  width: 0,
  height: 0
});

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isValidPageSize(size: PdfPageSize): boolean {
  return Number.isFinite(size.width) && Number.isFinite(size.height) && size.width > 0 && size.height > 0;
}

function resolveMinSize(pageSize: PdfPageSize, minSize: PdfPageSize): PdfPageSize {
  return {
    width: Math.min(pageSize.width, Math.max(0, minSize.width)),
    height: Math.min(pageSize.height, Math.max(0, minSize.height))
  };
}

export function normalizeRectWithinBounds(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  minSize: PdfPageSize = BBOX_MIN_SIZE
): PdfBboxRect {
  if (!isValidPageSize(pageSize)) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  const resolvedMin = resolveMinSize(pageSize, minSize);
  const width = clampValue(Math.abs(rect.width), resolvedMin.width, pageSize.width);
  const height = clampValue(Math.abs(rect.height), resolvedMin.height, pageSize.height);

  return {
    x: clampValue(rect.x, 0, pageSize.width - width),
    y: clampValue(rect.y, 0, pageSize.height - height),
    width,
    height
  };
}

export function clampPointToPage(point: PagePoint, pageSize: PdfPageSize): PagePoint {
  return {
    x: clampValue(point.x, 0, pageSize.width),
    y: clampValue(point.y, 0, pageSize.height)
  };
}

export function buildRectFromPoints(
  start: PagePoint,
  end: PagePoint,
  pageSize: PdfPageSize,
  minSize: PdfPageSize = BBOX_MIN_SIZE
): PdfBboxRect {
  if (!isValidPageSize(pageSize)) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  const resolvedMin = resolveMinSize(pageSize, minSize);
  const safeStart = clampPointToPage(start, pageSize);
  const safeEnd = clampPointToPage(end, pageSize);

  let left = Math.min(safeStart.x, safeEnd.x);
  let right = Math.max(safeStart.x, safeEnd.x);
  let top = Math.min(safeStart.y, safeEnd.y);
  let bottom = Math.max(safeStart.y, safeEnd.y);

  if (right - left < resolvedMin.width) {
    if (safeEnd.x >= safeStart.x) {
      right = left + resolvedMin.width;
    } else {
      left = right - resolvedMin.width;
    }
  }

  if (bottom - top < resolvedMin.height) {
    if (safeEnd.y >= safeStart.y) {
      bottom = top + resolvedMin.height;
    } else {
      top = bottom - resolvedMin.height;
    }
  }

  if (left < 0) {
    right -= left;
    left = 0;
  }
  if (right > pageSize.width) {
    left -= right - pageSize.width;
    right = pageSize.width;
  }
  if (top < 0) {
    bottom -= top;
    top = 0;
  }
  if (bottom > pageSize.height) {
    top -= bottom - pageSize.height;
    bottom = pageSize.height;
  }

  left = clampValue(left, 0, pageSize.width - resolvedMin.width);
  top = clampValue(top, 0, pageSize.height - resolvedMin.height);
  right = clampValue(right, left + resolvedMin.width, pageSize.width);
  bottom = clampValue(bottom, top + resolvedMin.height, pageSize.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

export function moveRectWithinBounds(
  rect: PdfBboxRect,
  deltaX: number,
  deltaY: number,
  pageSize: PdfPageSize
): PdfBboxRect {
  const normalizedRect = normalizeRectWithinBounds(rect, pageSize, BBOX_MIN_SIZE);
  return {
    ...normalizedRect,
    x: clampValue(normalizedRect.x + deltaX, 0, pageSize.width - normalizedRect.width),
    y: clampValue(normalizedRect.y + deltaY, 0, pageSize.height - normalizedRect.height)
  };
}

export function resizeRectWithinBounds(
  rect: PdfBboxRect,
  handle: BboxResizeHandle,
  deltaX: number,
  deltaY: number,
  pageSize: PdfPageSize,
  minSize: PdfPageSize = BBOX_MIN_SIZE
): PdfBboxRect {
  const normalizedRect = normalizeRectWithinBounds(rect, pageSize, minSize);
  const resolvedMin = resolveMinSize(pageSize, minSize);

  let left = normalizedRect.x;
  let top = normalizedRect.y;
  let right = normalizedRect.x + normalizedRect.width;
  let bottom = normalizedRect.y + normalizedRect.height;

  if (handle.includes("w")) {
    const nextLeft = left + deltaX;
    left = clampValue(nextLeft, 0, right - resolvedMin.width);
  }

  if (handle.includes("e")) {
    const nextRight = right + deltaX;
    right = clampValue(nextRight, left + resolvedMin.width, pageSize.width);
  }

  if (handle.includes("n")) {
    const nextTop = top + deltaY;
    top = clampValue(nextTop, 0, bottom - resolvedMin.height);
  }

  if (handle.includes("s")) {
    const nextBottom = bottom + deltaY;
    bottom = clampValue(nextBottom, top + resolvedMin.height, pageSize.height);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top
  };
}

export function clientPointToPagePoint(
  clientX: number,
  clientY: number,
  stageElement: HTMLElement | null,
  pageSize: PdfPageSize
): PagePoint | null {
  if (!stageElement || !isValidPageSize(pageSize)) {
    return null;
  }

  const stageRect = stageElement.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) {
    return null;
  }

  const scaleX = pageSize.width / stageRect.width;
  const scaleY = pageSize.height / stageRect.height;

  return {
    x: clampValue((clientX - stageRect.left) * scaleX, 0, pageSize.width),
    y: clampValue((clientY - stageRect.top) * scaleY, 0, pageSize.height)
  };
}

export function pageRectToDisplayRect(
  rect: PdfBboxRect,
  pageSize: PdfPageSize,
  displaySize: PdfPageSize
): BboxDisplayRect | null {
  if (!isValidPageSize(pageSize) || !isValidPageSize(displaySize)) {
    return null;
  }

  const boundedRect = normalizeRectWithinBounds(rect, pageSize, ZERO_MIN_SIZE);
  const scaleX = displaySize.width / pageSize.width;
  const scaleY = displaySize.height / pageSize.height;

  return {
    x: boundedRect.x * scaleX,
    y: boundedRect.y * scaleY,
    width: boundedRect.width * scaleX,
    height: boundedRect.height * scaleY
  };
}

export interface BboxDisplayLabelParts {
  entityLabel: string;
  instanceLabel: string | null;
}

export function getBboxDisplayLabelParts(
  entityLabel: string,
  instanceNumber: number | null
): BboxDisplayLabelParts {
  if (entityLabel.trim().length === 0) {
    return {
      entityLabel: "",
      instanceLabel: null
    };
  }

  if (instanceNumber === null) {
    return {
      entityLabel,
      instanceLabel: null
    };
  }

  return {
    entityLabel,
    instanceLabel: formatArabicIndicDigits(instanceNumber)
  };
}

export function formatBboxDisplayLabel(entityLabel: string, instanceNumber: number | null): string {
  const parts = getBboxDisplayLabelParts(entityLabel, instanceNumber);
  if (!parts.entityLabel) {
    return "";
  }

  if (!parts.instanceLabel) {
    return parts.entityLabel;
  }

  return `${parts.entityLabel}${BBOX_LABEL_SEPARATOR}${parts.instanceLabel}`;
}
