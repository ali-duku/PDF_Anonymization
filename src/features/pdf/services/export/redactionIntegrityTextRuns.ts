import type { PdfTextRun } from "@embedpdf/models";
import {
  EXPORT_INTEGRITY_TEXT_RUN_MASK_PADDING_PX,
  EXPORT_INTEGRITY_TEXT_RUN_MAX_MISSING_COUNT,
  EXPORT_INTEGRITY_TEXT_RUN_MAX_TOTAL_MISMATCH_RATIO,
  EXPORT_INTEGRITY_TEXT_RUN_MAX_UNEXPECTED_COUNT,
  EXPORT_INTEGRITY_TEXT_RUN_POSITION_TOLERANCE_PX,
  EXPORT_INTEGRITY_TEXT_RUN_SIZE_TOLERANCE_PX
} from "../../constants/export";
import type { PdfBbox } from "../../types/bbox";

interface FlatRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextRunSnapshot {
  text: string;
  rect: FlatRect;
}

export interface TextRunIntegrityMetrics {
  sourceOutsideCount: number;
  redactedOutsideCount: number;
  matchedCount: number;
  missingCount: number;
  unexpectedCount: number;
  totalMismatchRatio: number;
}

function normalizeRunText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isFiniteRect(rect: FlatRect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function toSnapshot(run: PdfTextRun): TextRunSnapshot | null {
  const text = normalizeRunText(run.text);
  if (text.length === 0) {
    return null;
  }

  const rect = {
    x: run.rect.origin.x,
    y: run.rect.origin.y,
    width: run.rect.size.width,
    height: run.rect.size.height
  };
  if (!isFiniteRect(rect)) {
    return null;
  }

  return {
    text,
    rect
  };
}

function intersects(left: FlatRect, right: FlatRect): boolean {
  const leftRight = left.x + left.width;
  const leftBottom = left.y + left.height;
  const rightRight = right.x + right.width;
  const rightBottom = right.y + right.height;

  return left.x < rightRight && leftRight > right.x && left.y < rightBottom && leftBottom > right.y;
}

function expandBboxRect(bbox: PdfBbox): FlatRect {
  return {
    x: bbox.x - EXPORT_INTEGRITY_TEXT_RUN_MASK_PADDING_PX,
    y: bbox.y - EXPORT_INTEGRITY_TEXT_RUN_MASK_PADDING_PX,
    width: bbox.width + EXPORT_INTEGRITY_TEXT_RUN_MASK_PADDING_PX * 2,
    height: bbox.height + EXPORT_INTEGRITY_TEXT_RUN_MASK_PADDING_PX * 2
  };
}

function isOutsideRedactionRegions(rect: FlatRect, bboxes: readonly PdfBbox[]): boolean {
  for (const bbox of bboxes) {
    if (intersects(rect, expandBboxRect(bbox))) {
      return false;
    }
  }

  return true;
}

function collectOutsideSnapshots(
  runs: readonly PdfTextRun[],
  bboxes: readonly PdfBbox[]
): TextRunSnapshot[] {
  const snapshots: TextRunSnapshot[] = [];

  for (const run of runs) {
    const snapshot = toSnapshot(run);
    if (!snapshot || !isOutsideRedactionRegions(snapshot.rect, bboxes)) {
      continue;
    }

    snapshots.push(snapshot);
  }

  return snapshots;
}

function areRectsEquivalent(left: FlatRect, right: FlatRect): boolean {
  return (
    Math.abs(left.x - right.x) <= EXPORT_INTEGRITY_TEXT_RUN_POSITION_TOLERANCE_PX &&
    Math.abs(left.y - right.y) <= EXPORT_INTEGRITY_TEXT_RUN_POSITION_TOLERANCE_PX &&
    Math.abs(left.width - right.width) <= EXPORT_INTEGRITY_TEXT_RUN_SIZE_TOLERANCE_PX &&
    Math.abs(left.height - right.height) <= EXPORT_INTEGRITY_TEXT_RUN_SIZE_TOLERANCE_PX
  );
}

function findMatchingSnapshotIndex(
  sourceSnapshot: TextRunSnapshot,
  candidates: readonly TextRunSnapshot[]
): number {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (sourceSnapshot.text !== candidate.text) {
      continue;
    }

    if (areRectsEquivalent(sourceSnapshot.rect, candidate.rect)) {
      return index;
    }
  }

  return -1;
}

export function evaluateTextRunDifference(
  sourceRuns: readonly PdfTextRun[],
  redactedRuns: readonly PdfTextRun[],
  bboxes: readonly PdfBbox[]
): TextRunIntegrityMetrics {
  const sourceOutsideRuns = collectOutsideSnapshots(sourceRuns, bboxes);
  const redactedOutsideRuns = collectOutsideSnapshots(redactedRuns, bboxes);
  const remainingRedactedRuns = [...redactedOutsideRuns];

  let matchedCount = 0;
  let missingCount = 0;

  for (const sourceRun of sourceOutsideRuns) {
    const matchingIndex = findMatchingSnapshotIndex(sourceRun, remainingRedactedRuns);
    if (matchingIndex < 0) {
      missingCount += 1;
      continue;
    }

    matchedCount += 1;
    remainingRedactedRuns.splice(matchingIndex, 1);
  }

  const unexpectedCount = remainingRedactedRuns.length;
  const totalOutsideRuns = sourceOutsideRuns.length + redactedOutsideRuns.length;
  const totalMismatchRatio =
    totalOutsideRuns > 0 ? (missingCount + unexpectedCount) / totalOutsideRuns : 0;

  return {
    sourceOutsideCount: sourceOutsideRuns.length,
    redactedOutsideCount: redactedOutsideRuns.length,
    matchedCount,
    missingCount,
    unexpectedCount,
    totalMismatchRatio
  };
}

export function isPageTextStructurallyUnsafe(metrics: TextRunIntegrityMetrics): boolean {
  return (
    metrics.missingCount > EXPORT_INTEGRITY_TEXT_RUN_MAX_MISSING_COUNT ||
    metrics.unexpectedCount > EXPORT_INTEGRITY_TEXT_RUN_MAX_UNEXPECTED_COUNT ||
    metrics.totalMismatchRatio > EXPORT_INTEGRITY_TEXT_RUN_MAX_TOTAL_MISMATCH_RATIO
  );
}

