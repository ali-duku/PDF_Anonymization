import { BBOX_DUPLICATE_SHIFT_X, BBOX_DUPLICATE_SHIFT_Y, BBOX_MIN_SIZE } from "../constants/bbox";
import type { BboxClipboardSnapshot, PdfBbox, PdfBboxRect, PdfPageSize } from "../types/bbox";
import { resolveBboxTextRotationQuarterTurns } from "./bboxState";
import { normalizeRectWithinBounds } from "./bboxGeometry";
import { normalizePotentialMojibakeText } from "./textEncoding";

export function createBboxClipboardSnapshot(bbox: PdfBbox): BboxClipboardSnapshot {
  return {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    entityLabel: normalizePotentialMojibakeText(bbox.entityLabel),
    instanceNumber: bbox.instanceNumber,
    textRotationQuarterTurns: resolveBboxTextRotationQuarterTurns(bbox.textRotationQuarterTurns)
  };
}

export function buildDuplicateRect(rect: PdfBboxRect, pageSize: PdfPageSize): PdfBboxRect {
  return normalizeRectWithinBounds(
    {
      x: rect.x + BBOX_DUPLICATE_SHIFT_X,
      y: rect.y + BBOX_DUPLICATE_SHIFT_Y,
      width: rect.width,
      height: rect.height
    },
    pageSize,
    BBOX_MIN_SIZE
  );
}

export function buildPastedRect(snapshot: BboxClipboardSnapshot, pageSize: PdfPageSize): PdfBboxRect {
  return normalizeRectWithinBounds(snapshot, pageSize, BBOX_MIN_SIZE);
}
