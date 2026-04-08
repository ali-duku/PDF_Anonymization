import {
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM
} from "../../constants/bbox";
import {
  EXPORT_LABEL_FONT_SHRINK_MIN_STEP,
  EXPORT_LABEL_FONT_SHRINK_RATIO,
  EXPORT_LABEL_MAX_FIT_ATTEMPTS,
  EXPORT_LABEL_MIN_FONT_SIZE,
  EXPORT_LABEL_RASTER_ALPHA_THRESHOLD,
  EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS,
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

interface RenderVerifiedExportLabelTextInput {
  measureContext: CanvasRenderingContext2D;
  drawContext: CanvasRenderingContext2D;
  labelText: string;
  sourceRect: PdfBboxRect;
  borderWidth: number;
  textRotationQuarterTurns: number;
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

interface RasterAlphaBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
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
  buildCanvasFont: (fontSize: number) => string
): MeasuredCanvasTextMetrics {
  context.font = buildCanvasFont(fontSize);
  context.direction = "rtl";
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

function resolveRasterAlphaBounds(
  drawContext: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): RasterAlphaBounds | null {
  const imageData = drawContext.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < canvasHeight; y += 1) {
    for (let x = 0; x < canvasWidth; x += 1) {
      const alpha = data[(y * canvasWidth + x) * 4 + 3];
      if (alpha < EXPORT_LABEL_RASTER_ALPHA_THRESHOLD) {
        continue;
      }

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return { left, top, right, bottom };
}

function doesRasterBoundsFitSafeRect(
  bounds: RasterAlphaBounds | null,
  safeRect: PdfBboxRect,
  scale: number
): boolean {
  if (!bounds) {
    return true;
  }

  const left = bounds.left / scale;
  const top = bounds.top / scale;
  const right = (bounds.right + 1) / scale;
  const bottom = (bounds.bottom + 1) / scale;
  const safeRight = safeRect.x + safeRect.width;
  const safeBottom = safeRect.y + safeRect.height;

  return (
    left >= safeRect.x - EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    top >= safeRect.y - EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    right <= safeRight + EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS &&
    bottom <= safeBottom + EXPORT_LABEL_RASTER_BOUNDS_EPSILON_UNITS
  );
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
  buildCanvasFont: (fontSize: number) => string
): CanvasLabelLayout {
  const safeFontSize = Math.max(fontSize, EXPORT_LABEL_MIN_FONT_SIZE);
  const contentBox = resolveBboxLabelContentBox(textFrameRect, borderWidth);
  const centerX = contentBox.x + contentBox.width * 0.5;
  const centerY = contentBox.y + contentBox.height * 0.5;
  const measured = measureCanvasTextMetrics(measureContext, labelText, safeFontSize, buildCanvasFont);
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
  layout: CanvasLabelLayout,
  fillStyle: string,
  buildCanvasFont: (fontSize: number) => string
): void {
  drawContext.clearRect(-1, -1, sourceRect.width + 2, sourceRect.height + 2);
  drawContext.fillStyle = fillStyle;
  drawContext.font = buildCanvasFont(layout.fontSize);
  drawContext.direction = "rtl";
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
  const measuredUnitMetrics = measureCanvasTextMetrics(measureContext, labelText, 1, buildCanvasFont);
  const fittedSpec = buildBboxLabelLayoutSpec({
    labelText,
    rect: textFrameRect,
    measuredWidthPerFontUnit: measuredUnitMetrics.inkWidth,
    measureTextMetrics: (fontSize, text) => measureCanvasTextMetrics(measureContext, text, fontSize, buildCanvasFont),
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
      buildCanvasFont
    );
    drawLabelCandidate(
      drawContext,
      labelText,
      sourceRect,
      textRotationQuarterTurns,
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
    buildCanvasFont
  );
  drawLabelCandidate(
    drawContext,
    labelText,
    sourceRect,
    textRotationQuarterTurns,
    fallbackLayout,
    fillStyle,
    buildCanvasFont
  );
}
