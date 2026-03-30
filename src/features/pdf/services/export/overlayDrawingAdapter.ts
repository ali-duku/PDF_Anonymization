import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import {
  BBOX_BORDER_COLOR,
  BBOX_BORDER_WIDTH,
  BBOX_CSS_PIXEL_TO_PDF_UNIT,
  BBOX_EXPORT_BORDER_VISUAL_WEIGHT_COMPENSATION,
  BBOX_FILL_COLOR,
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM,
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FONT_WEIGHT,
  BBOX_LABEL_SEPARATOR,
  BBOX_TEXT_COLOR
} from "../../constants/bbox";
import {
  EXPORT_CANVAS_ENCODE_TIMEOUT_MS,
  EXPORT_FONT_READY_TIMEOUT_MS,
  EXPORT_LABEL_CANVAS_SCALE,
  EXPORT_LABEL_MAX_CANVAS_EDGE,
  EXPORT_LABEL_MIN_CANVAS_EDGE
} from "../../constants/export";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import { formatBboxDisplayLabel, getBboxDisplayLabelParts } from "../../utils/bboxGeometry";
import { buildBboxLabelLayoutSpec } from "../../utils/bboxLabelLayout";
import { assertRectWithinPage, toPdfBottomLeftRect } from "./coordinateConversion";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";
import type { PageRedactionPlan } from "./redactionPlanBuilder";

interface ParsedColor {
  red: number;
  green: number;
  blue: number;
}

interface LabelCanvasSize {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  fontScale: number;
}

const LABEL_MEASURE_FONT_SIZE = 100;

function parseHexColor(hexColor: string): ParsedColor {
  const normalized = hexColor.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Invalid overlay color configuration.");
  }

  return {
    red: Number.parseInt(expanded.slice(0, 2), 16),
    green: Number.parseInt(expanded.slice(2, 4), 16),
    blue: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

function toPdfLibColor(hexColor: string) {
  const parsed = parseHexColor(hexColor);
  return rgb(parsed.red / 255, parsed.green / 255, parsed.blue / 255);
}

async function waitForDocumentFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(resolve, EXPORT_FONT_READY_TIMEOUT_MS);
      })
    ]);
  } catch {
    // Continue with browser fallback fonts if FontFaceSet is unavailable.
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document === "undefined") {
    throw new PdfExportError(
      PdfExportErrorCode.BrowserSupport,
      "PDF export is only available in a browser environment."
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blobPromise = new Promise<Blob | null>((resolve, reject) => {
    try {
      canvas.toBlob(resolve, "image/png");
    } catch (error) {
      reject(error);
    }
  });

  const blob = await withExportTimeout(
    blobPromise,
    EXPORT_CANVAS_ENCODE_TIMEOUT_MS,
    PdfExportErrorCode.OverlayRendering,
    "Timed out while encoding an overlay label image."
  );

  if (!blob) {
    throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Failed to encode an overlay label image.");
  }

  return new Uint8Array(await blob.arrayBuffer());
}

function resolveMeasuredLabelWidthPerFontUnit(
  context: CanvasRenderingContext2D,
  text: string
): number | null {
  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${LABEL_MEASURE_FONT_SIZE}px ${BBOX_LABEL_FONT_FAMILY}`;
  const measuredWidth = context.measureText(text).width;
  if (measuredWidth <= 0) {
    return null;
  }

  return measuredWidth / LABEL_MEASURE_FONT_SIZE;
}

function resolveMeasuredLabelTextMetrics(
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number
) {
  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${fontSize}px ${BBOX_LABEL_FONT_FAMILY}`;
  const metrics = context.measureText(text);

  return {
    width: metrics.width,
    ascent:
      typeof metrics.actualBoundingBoxAscent === "number" && metrics.actualBoundingBoxAscent > 0
        ? metrics.actualBoundingBoxAscent
        : BBOX_LABEL_ASCENT_EM * fontSize,
    descent:
      typeof metrics.actualBoundingBoxDescent === "number" && metrics.actualBoundingBoxDescent > 0
        ? metrics.actualBoundingBoxDescent
        : BBOX_LABEL_DESCENT_EM * fontSize
  };
}

function drawCenteredLabelRuns(
  context: CanvasRenderingContext2D,
  entityLabel: string,
  instanceLabel: string | null,
  centerX: number,
  baselineY: number
): void {
  if (!instanceLabel) {
    context.direction = "rtl";
    context.textAlign = "center";
    context.fillText(entityLabel, centerX, baselineY);
    return;
  }

  // Keep entity and Arabic-Indic number ordering identical to preview rendering.
  const entityWidth = context.measureText(entityLabel).width;
  const separatorWidth = context.measureText(BBOX_LABEL_SEPARATOR).width;
  const instanceWidth = context.measureText(instanceLabel).width;
  const totalWidth = entityWidth + separatorWidth + instanceWidth;
  const leftEdge = centerX - totalWidth * 0.5;

  context.direction = "rtl";
  context.textAlign = "right";
  context.fillText(entityLabel, leftEdge + entityWidth, baselineY);
  context.fillText(
    instanceLabel,
    leftEdge + entityWidth + separatorWidth + instanceWidth,
    baselineY
  );
}

function resolveLabelCanvasSize(rect: PdfBboxRect): LabelCanvasSize {
  const initialScale = EXPORT_LABEL_CANVAS_SCALE;
  let width = Math.max(Math.round(rect.width * initialScale), EXPORT_LABEL_MIN_CANVAS_EDGE);
  let height = Math.max(Math.round(rect.height * initialScale), EXPORT_LABEL_MIN_CANVAS_EDGE);

  const largestEdge = Math.max(width, height);
  if (largestEdge > EXPORT_LABEL_MAX_CANVAS_EDGE) {
    const reductionFactor = EXPORT_LABEL_MAX_CANVAS_EDGE / largestEdge;
    width = Math.max(Math.round(width * reductionFactor), EXPORT_LABEL_MIN_CANVAS_EDGE);
    height = Math.max(Math.round(height * reductionFactor), EXPORT_LABEL_MIN_CANVAS_EDGE);
  }

  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  return {
    width,
    height,
    scaleX,
    scaleY,
    fontScale: Math.min(scaleX, scaleY)
  };
}

async function createLabelOverlayImageBytes(
  bbox: PageRedactionPlan["bboxes"][0],
  rect: PdfBboxRect,
  borderWidth: number
): Promise<Uint8Array | null> {
  const labelText = formatBboxDisplayLabel(bbox.entityLabel, bbox.instanceNumber);
  if (!labelText) {
    return null;
  }

  const parts = getBboxDisplayLabelParts(bbox.entityLabel, bbox.instanceNumber);
  if (!parts.entityLabel) {
    return null;
  }

  const { width, height, scaleX, scaleY, fontScale } = resolveLabelCanvasSize(rect);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Unable to create overlay label context.");
  }

  const measuredWidthPerFontUnit = resolveMeasuredLabelWidthPerFontUnit(context, labelText);
  // Fit text in canonical PDF-space units first; canvas scaling only controls raster fidelity.
  const layoutSpec = buildBboxLabelLayoutSpec({
    labelText,
    rect: { x: 0, y: 0, width: rect.width, height: rect.height },
    measuredWidthPerFontUnit,
    measureTextMetrics: (fontSize, text) => resolveMeasuredLabelTextMetrics(context, text, fontSize),
    borderWidth,
    tokenScale: BBOX_CSS_PIXEL_TO_PDF_UNIT
  });
  const fontSize = Math.max(1, layoutSpec.fontSize * fontScale);

  context.clearRect(0, 0, width, height);
  context.fillStyle = BBOX_TEXT_COLOR;
  context.textBaseline = "alphabetic";
  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${fontSize}px ${BBOX_LABEL_FONT_FAMILY}`;
  drawCenteredLabelRuns(
    context,
    parts.entityLabel,
    parts.instanceLabel,
    layoutSpec.centerX * scaleX,
    layoutSpec.baselineY * scaleY
  );

  return canvasToPngBytes(canvas);
}

async function drawBboxOverlay(
  outputDocument: PDFDocument,
  page: PDFPage,
  pageSize: PdfPageSize,
  pageNumber: number,
  bbox: PageRedactionPlan["bboxes"][0]
): Promise<void> {
  const sourceRect = {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height
  };

  assertRectWithinPage(sourceRect, pageSize, {
    pageNumber,
    bboxId: bbox.id
  });

  const pdfRect = toPdfBottomLeftRect(sourceRect, pageSize);
  const fillColor = toPdfLibColor(BBOX_FILL_COLOR);
  const borderColor = toPdfLibColor(BBOX_BORDER_COLOR);
  // Keep export stroke weight visually aligned with preview's 1px CSS border token.
  const borderWidth = Math.max(
    BBOX_BORDER_WIDTH * BBOX_CSS_PIXEL_TO_PDF_UNIT * BBOX_EXPORT_BORDER_VISUAL_WEIGHT_COMPENSATION,
    0.1
  );
  const halfBorder = borderWidth * 0.5;

  page.drawRectangle({
    x: pdfRect.x,
    y: pdfRect.y,
    width: pdfRect.width,
    height: pdfRect.height,
    color: fillColor
  });

  page.drawRectangle({
    x: pdfRect.x + halfBorder,
    y: pdfRect.y + halfBorder,
    width: Math.max(pdfRect.width - borderWidth, 0),
    height: Math.max(pdfRect.height - borderWidth, 0),
    borderColor,
    borderWidth
  });

  const labelImageBytes = await createLabelOverlayImageBytes(bbox, sourceRect, borderWidth);
  if (!labelImageBytes) {
    return;
  }

  const labelImage = await outputDocument.embedPng(labelImageBytes);
  page.drawImage(labelImage, {
    x: pdfRect.x,
    y: pdfRect.y,
    width: pdfRect.width,
    height: pdfRect.height
  });
}

export async function drawPdfExportOverlays(
  sourcePdfBytes: Uint8Array,
  pagePlan: readonly PageRedactionPlan[]
): Promise<Uint8Array> {
  await waitForDocumentFonts();

  const outputDocument = await PDFDocument.load(sourcePdfBytes);

  for (const plan of pagePlan) {
    if (plan.bboxes.length === 0) {
      continue;
    }

    const pageIndex = plan.pageNumber - 1;
    if (pageIndex < 0 || pageIndex >= outputDocument.getPageCount()) {
      throw new PdfExportError(
        PdfExportErrorCode.CoordinateMapping,
        "A bbox references a page that does not exist.",
        {
          metadata: {
            pageNumber: plan.pageNumber,
            pageCount: outputDocument.getPageCount()
          }
        }
      );
    }

    const page = outputDocument.getPage(pageIndex);
    const pageSize: PdfPageSize = page.getSize();

    for (const bbox of plan.bboxes) {
      await drawBboxOverlay(outputDocument, page, pageSize, plan.pageNumber, bbox);
    }
  }

  return new Uint8Array(await outputDocument.save());
}
