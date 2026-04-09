import {
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM
} from "../../constants/bbox";
import {
  EXPORT_LABEL_FONT_SHRINK_MIN_STEP,
  EXPORT_LABEL_FONT_SHRINK_RATIO,
  EXPORT_LABEL_MAX_FIT_ATTEMPTS,
  EXPORT_LABEL_MIN_FONT_SIZE,
  EXPORT_LABEL_VERIFICATION_INSET_MAX_UNITS,
  EXPORT_LABEL_VERIFICATION_INSET_MIN_UNITS,
  EXPORT_LABEL_VERIFICATION_INSET_RATIO
} from "../../constants/exportLabelSafety";
import type { PdfBboxRect } from "../../types/bbox";
import {
  bboxTextRotationQuarterTurnsToDegrees,
  getBboxTextFitRect
} from "../../utils/bboxTextRotation";
import {
  buildBboxLabelLayoutSpec,
  normalizeBboxLabelText,
  resolveBboxLabelContentBox,
  resolveBboxLabelSafeInset,
  type BboxMeasuredTextMetrics
} from "../../utils/bboxLabelLayout";
import {
  doesRasterBoundsFitSafeRect,
  resolveRasterAlphaBounds
} from "./exportLabelRasterBounds";

interface RenderVerifiedExportLabelTextInput {
  measureContext: CanvasRenderingContext2D;
  drawContext: CanvasRenderingContext2D;
  labelText: string;
  sourceRect: PdfBboxRect;
  borderWidth: number;
  textRotationQuarterTurns: number;
  direction: CanvasDirection;
  scale: number;
  fillStyle: string;
  buildCanvasFont: (fontSize: number) => string;
}

interface CanvasLabelLayout {
  fontSize: number;
  centerX: number;
  baselineY: number;
  textFrameWidth: number;
  textFrameHeight: number;
}

interface MeasuredCanvasTextMetrics extends BboxMeasuredTextMetrics {
  inkWidth: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeExportLabelText(labelText: string): string {
  const singleLineText = labelText.replace(/[\t\r\n\f\v]+/g, " ").replace(/\s+/g, " ").trim();
  return normalizeBboxLabelText(singleLineText);
}

function resolveInkWidth(metrics: TextMetrics): number {
  const widthFromBounds = Math.abs(metrics.actualBoundingBoxLeft) + Math.abs(metrics.actualBoundingBoxRight);
  const width = Number.isFinite(metrics.width) && metrics.width > 0 ? metrics.width : 0;
  const boundsWidth = Number.isFinite(widthFromBounds) && widthFromBounds > 0 ? widthFromBounds : 0;
  return Math.max(width, boundsWidth);
}

function measureCanvasTextMetrics(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  direction: CanvasDirection,
  buildCanvasFont: (fontSize: number) => string
): MeasuredCanvasTextMetrics {
  context.font = buildCanvasFont(fontSize);
  context.direction = direction;
  const measured = context.measureText(text);
  const ascent =
    measured.actualBoundingBoxAscent > 0 ? measured.actualBoundingBoxAscent : BBOX_LABEL_ASCENT_EM * fontSize;
  const descent =
    measured.actualBoundingBoxDescent > 0 ? measured.actualBoundingBoxDescent : BBOX_LABEL_DESCENT_EM * fontSize;

  return {
    width: measured.width,
    ascent,
    descent,
    inkWidth: resolveInkWidth(measured)
  };
}

function resolveVerificationInset(sourceRect: PdfBboxRect): number {
  const minEdge = Math.max(Math.min(sourceRect.width, sourceRect.height), 0);
  const scaledInset = minEdge * EXPORT_LABEL_VERIFICATION_INSET_RATIO;
  return clamp(scaledInset, EXPORT_LABEL_VERIFICATION_INSET_MIN_UNITS, EXPORT_LABEL_VERIFICATION_INSET_MAX_UNITS);
}

function resolveVerificationSafeRect(sourceRect: PdfBboxRect, borderWidth: number): PdfBboxRect {
  const requestedInset = resolveBboxLabelSafeInset(borderWidth) + resolveVerificationInset(sourceRect);
  const maxInsetX = Math.max(sourceRect.width * 0.5, 0);
  const maxInsetY = Math.max(sourceRect.height * 0.5, 0);
  const safeInset = Math.min(requestedInset, maxInsetX, maxInsetY);
  return {
    x: safeInset,
    y: safeInset,
    width: Math.max(sourceRect.width - safeInset * 2, 0),
    height: Math.max(sourceRect.height - safeInset * 2, 0)
  };
}

function shrinkFontSize(fontSize: number): number {
  const byRatio = fontSize * EXPORT_LABEL_FONT_SHRINK_RATIO;
  const byStep = fontSize - EXPORT_LABEL_FONT_SHRINK_MIN_STEP;
  return Math.max(EXPORT_LABEL_MIN_FONT_SIZE, Math.min(byRatio, byStep));
}

function resolveLayoutAtFontSize(
  measureContext: CanvasRenderingContext2D,
  labelText: string,
  textFrameRect: PdfBboxRect,
  borderWidth: number,
  fontSize: number,
  direction: CanvasDirection,
  buildCanvasFont: (fontSize: number) => string
): CanvasLabelLayout {
  const safeFontSize = Math.max(fontSize, EXPORT_LABEL_MIN_FONT_SIZE);
  const contentBox = resolveBboxLabelContentBox(textFrameRect, borderWidth);
  const centerX = contentBox.x + contentBox.width * 0.5;
  const centerY = contentBox.y + contentBox.height * 0.5;
  const measured = measureCanvasTextMetrics(
    measureContext,
    labelText,
    safeFontSize,
    direction,
    buildCanvasFont
  );
  const baselineY = centerY + (measured.ascent - measured.descent) * 0.5;

  return {
    fontSize: safeFontSize,
    centerX,
    baselineY,
    textFrameWidth: textFrameRect.width,
    textFrameHeight: textFrameRect.height
  };
}

function drawLabelCandidate(
  drawContext: CanvasRenderingContext2D,
  labelText: string,
  sourceRect: PdfBboxRect,
  textRotationQuarterTurns: number,
  direction: CanvasDirection,
  layout: CanvasLabelLayout,
  fillStyle: string,
  buildCanvasFont: (fontSize: number) => string
): void {
  drawContext.clearRect(-1, -1, sourceRect.width + 2, sourceRect.height + 2);
  drawContext.fillStyle = fillStyle;
  drawContext.font = buildCanvasFont(layout.fontSize);
  drawContext.direction = direction;
  drawContext.textAlign = "center";
  drawContext.textBaseline = "alphabetic";

  const textRotationRadians = (bboxTextRotationQuarterTurnsToDegrees(textRotationQuarterTurns) * Math.PI) / 180;
  const textAnchorX = layout.centerX - layout.textFrameWidth * 0.5;
  const textBaselineY = layout.baselineY - layout.textFrameHeight * 0.5;

  drawContext.save();
  drawContext.translate(sourceRect.width * 0.5, sourceRect.height * 0.5);
  if (textRotationRadians !== 0) {
    drawContext.rotate(textRotationRadians);
  }
  drawContext.fillText(labelText, textAnchorX, textBaselineY);
  drawContext.restore();
}

export function renderVerifiedExportLabelText({
  measureContext,
  drawContext,
  labelText,
  sourceRect,
  borderWidth,
  textRotationQuarterTurns,
  direction,
  scale,
  fillStyle,
  buildCanvasFont
}: RenderVerifiedExportLabelTextInput): void {
  const textFrameRect = getBboxTextFitRect(
    {
      x: 0,
      y: 0,
      width: sourceRect.width,
      height: sourceRect.height
    },
    textRotationQuarterTurns
  );
  const measuredUnitMetrics = measureCanvasTextMetrics(
    measureContext,
    labelText,
    1,
    direction,
    buildCanvasFont
  );
  const fittedSpec = buildBboxLabelLayoutSpec({
    labelText,
    rect: textFrameRect,
    measuredWidthPerFontUnit: measuredUnitMetrics.inkWidth,
    measureTextMetrics: (fontSize, text) =>
      measureCanvasTextMetrics(measureContext, text, fontSize, direction, buildCanvasFont),
    borderWidth
  });
  const safeRect = resolveVerificationSafeRect(sourceRect, borderWidth);
  let currentFontSize = Math.max(fittedSpec.fontSize, EXPORT_LABEL_MIN_FONT_SIZE);

  for (let attempt = 0; attempt < EXPORT_LABEL_MAX_FIT_ATTEMPTS; attempt += 1) {
    const layout = resolveLayoutAtFontSize(
      measureContext,
      labelText,
      textFrameRect,
      borderWidth,
      currentFontSize,
      direction,
      buildCanvasFont
    );
    drawLabelCandidate(
      drawContext,
      labelText,
      sourceRect,
      textRotationQuarterTurns,
      direction,
      layout,
      fillStyle,
      buildCanvasFont
    );
    const bounds = resolveRasterAlphaBounds(drawContext, drawContext.canvas.width, drawContext.canvas.height);
    if (doesRasterBoundsFitSafeRect(bounds, safeRect, scale)) {
      return;
    }

    const nextFontSize = shrinkFontSize(currentFontSize);
    if (nextFontSize >= currentFontSize) {
      currentFontSize = Math.max(currentFontSize * 0.5, EXPORT_LABEL_MIN_FONT_SIZE);
      continue;
    }
    currentFontSize = nextFontSize;
  }

  const fallbackLayout = resolveLayoutAtFontSize(
    measureContext,
    labelText,
    textFrameRect,
    borderWidth,
    EXPORT_LABEL_MIN_FONT_SIZE,
    direction,
    buildCanvasFont
  );
  drawLabelCandidate(
    drawContext,
    labelText,
    sourceRect,
    textRotationQuarterTurns,
    direction,
    fallbackLayout,
    fillStyle,
    buildCanvasFont
  );
}
