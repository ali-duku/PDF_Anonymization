import {
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FIT_SAFETY_INSET,
  BBOX_LABEL_FONT_WEIGHT,
  BBOX_LABEL_LINE_HEIGHT,
  BBOX_LABEL_MAX_FONT_SIZE,
  BBOX_LABEL_MIN_FONT_SIZE,
  BBOX_LABEL_PADDING
} from "../constants/bbox";
import type { BboxDisplayRect } from "../types/bbox";

export interface AdaptiveBboxLabelSizing {
  fontSize: number;
  lineHeight: number;
}

const LABEL_MEASURE_FONT_SIZE = 100;
let labelMeasureContext: CanvasRenderingContext2D | null | undefined;

function getLabelMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (labelMeasureContext !== undefined) {
    return labelMeasureContext;
  }

  const canvas = document.createElement("canvas");
  labelMeasureContext = canvas.getContext("2d");
  return labelMeasureContext;
}

function normalizeLabelText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function estimateTextUnits(text: string): number {
  let totalUnits = 0;

  for (const character of text) {
    if (/\s/.test(character)) {
      totalUnits += 0.35;
      continue;
    }

    if (/[\u0600-\u06FF]/u.test(character)) {
      totalUnits += 0.78;
      continue;
    }

    if (/\d/.test(character)) {
      totalUnits += 0.62;
      continue;
    }

    totalUnits += 0.66;
  }

  return Math.max(totalUnits, 1);
}

function resolveMeasuredTextWidthPerPixel(text: string): number | null {
  const context = getLabelMeasureContext();
  if (!context) {
    return null;
  }

  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${LABEL_MEASURE_FONT_SIZE}px ${BBOX_LABEL_FONT_FAMILY}`;
  const width = context.measureText(text).width;
  if (width <= 0) {
    return null;
  }

  return width / LABEL_MEASURE_FONT_SIZE;
}

export function getAdaptiveBboxLabelSizing(
  labelText: string,
  displayRect: BboxDisplayRect
): AdaptiveBboxLabelSizing {
  const normalizedText = normalizeLabelText(labelText);
  // Keep a tiny fit inset so anti-aliased glyph edges don't visually collide with bbox borders.
  const usableWidth = Math.max(
    displayRect.width - BBOX_LABEL_PADDING * 2 - BBOX_LABEL_FIT_SAFETY_INSET,
    0.1
  );
  const usableHeight = Math.max(
    displayRect.height - BBOX_LABEL_PADDING * 2 - BBOX_LABEL_FIT_SAFETY_INSET,
    0.1
  );

  if (!normalizedText) {
    return {
      fontSize: BBOX_LABEL_MIN_FONT_SIZE,
      lineHeight: BBOX_LABEL_LINE_HEIGHT
    };
  }

  const measuredWidthPerPixel = resolveMeasuredTextWidthPerPixel(normalizedText);
  const fallbackWidthPerPixel = estimateTextUnits(normalizedText);
  const widthPerPixel = Math.max(measuredWidthPerPixel ?? fallbackWidthPerPixel, 0.1);

  const widthLimitedFontSize = usableWidth / widthPerPixel;
  const heightLimitedFontSize = usableHeight / BBOX_LABEL_LINE_HEIGHT;
  const targetFontSize = Math.min(widthLimitedFontSize, heightLimitedFontSize);
  const clampedFontSize = Math.max(
    BBOX_LABEL_MIN_FONT_SIZE,
    Math.min(targetFontSize, BBOX_LABEL_MAX_FONT_SIZE)
  );

  return {
    fontSize: Number(clampedFontSize.toFixed(2)),
    lineHeight: BBOX_LABEL_LINE_HEIGHT
  };
}
