import {
  BBOX_BORDER_WIDTH,
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM,
  BBOX_LABEL_FIT_SAFETY_INSET,
  BBOX_LABEL_LINEBOX_EM,
  BBOX_LABEL_LINE_HEIGHT,
  BBOX_LABEL_MAX_FONT_SIZE,
  BBOX_LABEL_MEASURED_WIDTH_SAFETY_MULTIPLIER,
  BBOX_LABEL_METRICS_FIT_SAFETY_RATIO,
  BBOX_LABEL_MIN_CONTENT_EDGE,
  BBOX_LABEL_MIN_FONT_SIZE,
  BBOX_LABEL_PADDING,
  BBOX_LABEL_WIDTH_SAFETY_MULTIPLIER
} from "../constants/bbox";
import type { PdfBboxRect } from "../types/bbox";

interface BboxLabelLayoutInput {
  labelText: string;
  rect: PdfBboxRect;
  measuredWidthPerFontUnit?: number | null;
  measureTextMetrics?: BboxLabelMeasureMetrics | null;
  borderWidth?: number;
  tokenScale?: number;
}

export interface BboxLabelContentBox extends PdfBboxRect {}

export interface BboxLabelLayoutSpec {
  normalizedText: string;
  contentBox: BboxLabelContentBox;
  fontSize: number;
  lineHeight: number;
  centerX: number;
  centerY: number;
  baselineY: number;
}

export interface BboxMeasuredTextMetrics {
  width: number;
  ascent: number;
  descent: number;
  inkWidth?: number;
}

export type BboxLabelMeasureMetrics = (
  fontSize: number,
  text: string
) => BboxMeasuredTextMetrics | null;

const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF]/u;
const ARABIC_INDIC_DIGIT_REGEX = /[\u0660-\u0669]/u;
const ASCII_DIGIT_REGEX = /[0-9]/;
const LATIN_UPPER_REGEX = /[A-Z]/;
const LATIN_LOWER_REGEX = /[a-z]/;
const PUNCTUATION_REGEX = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeBboxLabelText(text: string): string {
  return text.trim().length === 0 ? "" : text;
}

export function estimateBboxLabelWidthUnits(labelText: string): number {
  let totalUnits = 0;

  for (const character of labelText) {
    if (/\s/.test(character)) {
      totalUnits += 0.35;
      continue;
    }

    if (ARABIC_INDIC_DIGIT_REGEX.test(character) || ASCII_DIGIT_REGEX.test(character)) {
      totalUnits += 0.66;
      continue;
    }

    if (ARABIC_SCRIPT_REGEX.test(character)) {
      totalUnits += 0.9;
      continue;
    }

    if (LATIN_UPPER_REGEX.test(character)) {
      totalUnits += 0.75;
      continue;
    }

    if (LATIN_LOWER_REGEX.test(character)) {
      totalUnits += 0.68;
      continue;
    }

    if (PUNCTUATION_REGEX.test(character)) {
      totalUnits += 0.56;
      continue;
    }

    totalUnits += 0.8;
  }

  return Math.max(totalUnits, 1);
}

function resolveScaledToken(value: number, tokenScale: number): number {
  return Math.max(value * tokenScale, 0);
}

export function resolveBboxLabelSafeInset(
  borderWidth: number = BBOX_BORDER_WIDTH,
  tokenScale: number = 1
): number {
  const halfBorder = Math.max(borderWidth, 0) * 0.5;
  return (
    resolveScaledToken(BBOX_LABEL_PADDING, tokenScale) +
    resolveScaledToken(BBOX_LABEL_FIT_SAFETY_INSET, tokenScale) +
    halfBorder
  );
}

export function resolveBboxLabelContentBox(
  rect: PdfBboxRect,
  borderWidth: number = BBOX_BORDER_WIDTH,
  tokenScale: number = 1
): BboxLabelContentBox {
  const safeRectWidth = Math.max(rect.width, 0);
  const safeRectHeight = Math.max(rect.height, 0);
  const scaledMinContentEdge = Math.max(resolveScaledToken(BBOX_LABEL_MIN_CONTENT_EDGE, tokenScale), 0.01);
  const minWidth = Math.min(scaledMinContentEdge, safeRectWidth);
  const minHeight = Math.min(scaledMinContentEdge, safeRectHeight);
  const requestedInset = resolveBboxLabelSafeInset(borderWidth, tokenScale);
  const maxInsetX = Math.max((safeRectWidth - minWidth) * 0.5, 0);
  const maxInsetY = Math.max((safeRectHeight - minHeight) * 0.5, 0);
  const inset = Math.min(requestedInset, maxInsetX, maxInsetY);
  const width = Math.max(safeRectWidth - inset * 2, minWidth);
  const height = Math.max(safeRectHeight - inset * 2, minHeight);

  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width,
    height
  };
}

export function resolveBboxLabelWidthPerFontUnit(
  labelText: string,
  measuredWidthPerFontUnit?: number | null
): number {
  const deterministicWidth = estimateBboxLabelWidthUnits(labelText) * BBOX_LABEL_WIDTH_SAFETY_MULTIPLIER;
  const measuredWidth =
    typeof measuredWidthPerFontUnit === "number" && Number.isFinite(measuredWidthPerFontUnit)
      ? measuredWidthPerFontUnit * BBOX_LABEL_MEASURED_WIDTH_SAFETY_MULTIPLIER
      : 0;

  return Math.max(deterministicWidth, measuredWidth, BBOX_LABEL_MIN_CONTENT_EDGE);
}

function resolveMeasuredTextHorizontalSpan(metrics: BboxMeasuredTextMetrics): number {
  const width = Number.isFinite(metrics.width) && metrics.width > 0 ? metrics.width : 0;
  const inkWidth =
    typeof metrics.inkWidth === "number" && Number.isFinite(metrics.inkWidth) && metrics.inkWidth > 0
      ? metrics.inkWidth
      : 0;
  return Math.max(width, inkWidth);
}

export function resolveBboxLabelFontSize(
  labelText: string,
  contentBox: BboxLabelContentBox,
  measuredWidthPerFontUnit?: number | null,
  measureTextMetrics?: BboxLabelMeasureMetrics | null,
  tokenScale: number = 1
): number {
  const normalizedText = normalizeBboxLabelText(labelText);
  const scaledMinFontSize = resolveScaledToken(BBOX_LABEL_MIN_FONT_SIZE, tokenScale);
  const scaledMaxFontSize = resolveScaledToken(BBOX_LABEL_MAX_FONT_SIZE, tokenScale);

  if (!normalizedText) {
    return scaledMinFontSize;
  }

  const widthPerFontUnit = resolveBboxLabelWidthPerFontUnit(normalizedText, measuredWidthPerFontUnit);
  const widthLimitedFontSize = contentBox.width / widthPerFontUnit;
  const heightLimitedFontSize = contentBox.height / BBOX_LABEL_LINEBOX_EM;
  const safeFontSize = Math.min(widthLimitedFontSize, heightLimitedFontSize);
  const heuristicFontSize = clamp(safeFontSize, scaledMinFontSize, scaledMaxFontSize);

  if (!measureTextMetrics) {
    return heuristicFontSize;
  }

  const safeWidth = contentBox.width * BBOX_LABEL_METRICS_FIT_SAFETY_RATIO;
  const safeHeight = contentBox.height * BBOX_LABEL_METRICS_FIT_SAFETY_RATIO;
  const fitsAtSize = (fontSize: number): boolean => {
    const measured = measureTextMetrics(fontSize, normalizedText);
    if (!measured) {
      return true;
    }

    const measuredWidth = resolveMeasuredTextHorizontalSpan(measured);
    if (measuredWidth <= 0) {
      return true;
    }

    const measuredHeight = measured.ascent + measured.descent;
    return measuredWidth <= safeWidth && measuredHeight <= safeHeight;
  };

  if (!fitsAtSize(scaledMinFontSize)) {
    return scaledMinFontSize;
  }

  let low = scaledMinFontSize;
  let high = scaledMaxFontSize;

  if (!fitsAtSize(high)) {
    // Find the largest one-line font that stays inside the safe content box.
    for (let step = 0; step < 18; step += 1) {
      const mid = (low + high) * 0.5;
      if (fitsAtSize(mid)) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return clamp(low, scaledMinFontSize, scaledMaxFontSize);
  }

  return scaledMaxFontSize;
}

export function buildBboxLabelLayoutSpec({
  labelText,
  rect,
  measuredWidthPerFontUnit,
  measureTextMetrics,
  borderWidth = BBOX_BORDER_WIDTH,
  tokenScale = 1
}: BboxLabelLayoutInput): BboxLabelLayoutSpec {
  const normalizedText = normalizeBboxLabelText(labelText);
  const contentBox = resolveBboxLabelContentBox(rect, borderWidth, tokenScale);
  const fontSize = resolveBboxLabelFontSize(
    normalizedText,
    contentBox,
    measuredWidthPerFontUnit,
    measureTextMetrics,
    tokenScale
  );
  const centerX = contentBox.x + contentBox.width * 0.5;
  const centerY = contentBox.y + contentBox.height * 0.5;
  const measured = normalizedText && measureTextMetrics ? measureTextMetrics(fontSize, normalizedText) : null;
  const ascent = measured?.ascent && measured.ascent > 0 ? measured.ascent : BBOX_LABEL_ASCENT_EM * fontSize;
  const descent = measured?.descent && measured.descent > 0 ? measured.descent : BBOX_LABEL_DESCENT_EM * fontSize;
  // Center baseline from real glyph bounds when available; fallback to calibrated ascent/descent envelope.
  const baselineY = centerY + (ascent - descent) * 0.5;

  return {
    normalizedText,
    contentBox,
    fontSize,
    lineHeight: BBOX_LABEL_LINE_HEIGHT,
    centerX,
    centerY,
    baselineY
  };
}
