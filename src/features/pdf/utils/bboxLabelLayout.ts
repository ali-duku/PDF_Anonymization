import {
  BBOX_BORDER_WIDTH,
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM,
  BBOX_LABEL_FIT_SAFETY_INSET,
  BBOX_LABEL_LINEBOX_EM,
  BBOX_LABEL_LINE_HEIGHT,
  BBOX_LABEL_MAX_FONT_SIZE,
  BBOX_LABEL_MEASURED_WIDTH_SAFETY_MULTIPLIER,
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
  borderWidth?: number;
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
  return text.replace(/\s+/g, " ").trim();
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

export function resolveBboxLabelSafeInset(borderWidth: number = BBOX_BORDER_WIDTH): number {
  const halfBorder = Math.max(borderWidth, 0) * 0.5;
  return BBOX_LABEL_PADDING + BBOX_LABEL_FIT_SAFETY_INSET + halfBorder;
}

export function resolveBboxLabelContentBox(
  rect: PdfBboxRect,
  borderWidth: number = BBOX_BORDER_WIDTH
): BboxLabelContentBox {
  const inset = resolveBboxLabelSafeInset(borderWidth);
  const width = Math.max(rect.width - inset * 2, BBOX_LABEL_MIN_CONTENT_EDGE);
  const height = Math.max(rect.height - inset * 2, BBOX_LABEL_MIN_CONTENT_EDGE);

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

export function resolveBboxLabelFontSize(
  labelText: string,
  contentBox: BboxLabelContentBox,
  measuredWidthPerFontUnit?: number | null
): number {
  const normalizedText = normalizeBboxLabelText(labelText);
  if (!normalizedText) {
    return BBOX_LABEL_MIN_FONT_SIZE;
  }

  const widthPerFontUnit = resolveBboxLabelWidthPerFontUnit(normalizedText, measuredWidthPerFontUnit);
  const widthLimitedFontSize = contentBox.width / widthPerFontUnit;
  const heightLimitedFontSize = contentBox.height / BBOX_LABEL_LINEBOX_EM;
  const safeFontSize = Math.min(widthLimitedFontSize, heightLimitedFontSize);

  return clamp(safeFontSize, BBOX_LABEL_MIN_FONT_SIZE, BBOX_LABEL_MAX_FONT_SIZE);
}

export function buildBboxLabelLayoutSpec({
  labelText,
  rect,
  measuredWidthPerFontUnit,
  borderWidth = BBOX_BORDER_WIDTH
}: BboxLabelLayoutInput): BboxLabelLayoutSpec {
  const normalizedText = normalizeBboxLabelText(labelText);
  const contentBox = resolveBboxLabelContentBox(rect, borderWidth);
  const fontSize = resolveBboxLabelFontSize(normalizedText, contentBox, measuredWidthPerFontUnit);
  const centerX = contentBox.x + contentBox.width * 0.5;
  const centerY = contentBox.y + contentBox.height * 0.5;
  // Place an alphabetic baseline so ascent/descent stay inside the safe line box.
  const baselineY = centerY + ((BBOX_LABEL_ASCENT_EM - BBOX_LABEL_DESCENT_EM) * fontSize) / 2;

  return {
    normalizedText,
    contentBox,
    fontSize: Number(fontSize.toFixed(2)),
    lineHeight: BBOX_LABEL_LINE_HEIGHT,
    centerX,
    centerY,
    baselineY
  };
}
