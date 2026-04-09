import {
  EXPORT_LABEL_FIT_BINARY_SEARCH_STEPS,
  EXPORT_LABEL_FIT_FINAL_SHRINK_RATIO,
  EXPORT_LABEL_FIT_SAFETY_RATIO,
  EXPORT_LABEL_MIN_FONT_SIZE
} from "../../constants/exportTypography";
import type { PdfBboxRect } from "../../types/bbox";
import type { ExportLabelTextRun } from "./exportLabelRunLayout";

export interface ExportLabelFitResult {
  fontSize: number;
  lineWidth: number;
  ascent: number;
  descent: number;
  lineHeight: number;
}

interface ResolveExportLabelFitInput {
  runs: readonly ExportLabelTextRun[];
  contentBox: PdfBboxRect;
  minFontSize: number;
  maxFontSize: number;
}

interface UnitLineMetrics {
  width: number;
  ascent: number;
  descent: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveUnitLineMetrics(runs: readonly ExportLabelTextRun[]): UnitLineMetrics {
  let width = 0;
  let ascent = 0;
  let descent = 0;

  for (const run of runs) {
    width += run.widthAtUnit;
    ascent = Math.max(ascent, run.font.ascentRatio);
    descent = Math.max(descent, run.font.descentRatio);
  }

  const safeAscent = Math.max(ascent, 0.01);
  const safeDescent = Math.max(descent, 0.01);

  return {
    width: Math.max(width, 0),
    ascent: safeAscent,
    descent: safeDescent,
    height: safeAscent + safeDescent
  };
}

function measureAtFontSize(unit: UnitLineMetrics, fontSize: number): ExportLabelFitResult {
  const safeFontSize = Math.max(fontSize, EXPORT_LABEL_MIN_FONT_SIZE);
  const ascent = unit.ascent * safeFontSize;
  const descent = unit.descent * safeFontSize;

  return {
    fontSize: safeFontSize,
    lineWidth: unit.width * safeFontSize,
    ascent,
    descent,
    lineHeight: ascent + descent
  };
}

function canFit(
  unit: UnitLineMetrics,
  fontSize: number,
  safeWidth: number,
  safeHeight: number
): boolean {
  const measured = measureAtFontSize(unit, fontSize);
  return measured.lineWidth <= safeWidth && measured.lineHeight <= safeHeight;
}

function resolveGuaranteedSafeSize(unit: UnitLineMetrics, safeWidth: number, safeHeight: number): number {
  const widthLimited = unit.width > 0 ? safeWidth / unit.width : Number.POSITIVE_INFINITY;
  const heightLimited = unit.height > 0 ? safeHeight / unit.height : Number.POSITIVE_INFINITY;
  const unclampedSize = Math.min(widthLimited, heightLimited);
  if (!Number.isFinite(unclampedSize) || unclampedSize <= 0) {
    return EXPORT_LABEL_MIN_FONT_SIZE;
  }

  return Math.max(unclampedSize * EXPORT_LABEL_FIT_FINAL_SHRINK_RATIO, EXPORT_LABEL_MIN_FONT_SIZE);
}

export function resolveExportLabelFit({
  runs,
  contentBox,
  minFontSize,
  maxFontSize
}: ResolveExportLabelFitInput): ExportLabelFitResult | null {
  if (runs.length === 0 || contentBox.width <= 0 || contentBox.height <= 0) {
    return null;
  }

  const unit = resolveUnitLineMetrics(runs);
  const safeWidth = Math.max(contentBox.width * EXPORT_LABEL_FIT_SAFETY_RATIO, 0);
  const safeHeight = Math.max(contentBox.height * EXPORT_LABEL_FIT_SAFETY_RATIO, 0);
  const lowBound = Math.max(minFontSize, EXPORT_LABEL_MIN_FONT_SIZE);
  const highBound = Math.max(maxFontSize, lowBound);

  if (!canFit(unit, lowBound, safeWidth, safeHeight)) {
    return measureAtFontSize(unit, resolveGuaranteedSafeSize(unit, safeWidth, safeHeight));
  }

  if (canFit(unit, highBound, safeWidth, safeHeight)) {
    const safeSize = highBound * EXPORT_LABEL_FIT_FINAL_SHRINK_RATIO;
    return measureAtFontSize(unit, clamp(safeSize, EXPORT_LABEL_MIN_FONT_SIZE, highBound));
  }

  let low = lowBound;
  let high = highBound;

  for (let step = 0; step < EXPORT_LABEL_FIT_BINARY_SEARCH_STEPS; step += 1) {
    const mid = (low + high) * 0.5;
    if (canFit(unit, mid, safeWidth, safeHeight)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const safeSize = low * EXPORT_LABEL_FIT_FINAL_SHRINK_RATIO;
  return measureAtFontSize(unit, clamp(safeSize, EXPORT_LABEL_MIN_FONT_SIZE, highBound));
}
