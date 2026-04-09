import { degrees, type PDFDocument, type PDFPage } from "pdf-lib";
import type { AppLanguageMode } from "../../../../types/language";
import { resolveLanguageModePresentation } from "../../../../utils/languageMode";
import { BBOX_LABEL_FONT_WEIGHT } from "../../constants/bbox";
import { EXPORT_LABEL_CANVAS_SCALE } from "../../constants/exportLabelSafety";
import { EXPORT_LABEL_FONT_URLS, EXPORT_LABEL_TEXT_COLOR_HEX } from "../../constants/exportTypography";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import { normalizeBboxTextRotationQuarterTurns } from "../../utils/bboxTextRotation";
import { formatBboxDisplayLabel } from "../../utils/bboxGeometry";
import { toPdfPagePointFromDevicePoint } from "./coordinateConversion";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { normalizeExportLabelText, renderVerifiedExportLabelText } from "./exportLabelCanvasLayout";

interface DrawExportLabelTextInput {
  document: PDFDocument;
  page: PDFPage;
  sourceRect: PdfBboxRect;
  pageSize: PdfPageSize;
  pageQuarterTurns: number;
  borderWidth: number;
  languageMode: AppLanguageMode;
  bbox: {
    entityLabel: string;
    instanceNumber: number | null;
    textRotationQuarterTurns: number;
  };
}

interface TextCoordinateContext {
  pageSize: PdfPageSize;
  pageQuarterTurns: number;
  rotationDegrees: number;
}

const EXPORT_LABEL_ARABIC_FONT_FAMILY = "PdfExportLabelArabic";
const EXPORT_LABEL_LATIN_FONT_FAMILY = "PdfExportLabelLatin";

let canvasFontLoadPromise: Promise<void> | null = null;
let textMeasureContext: CanvasRenderingContext2D | null | undefined;

function ensureCanvasEnvironment(): void {
  if (typeof document === "undefined") {
    throw new PdfExportError(PdfExportErrorCode.BrowserSupport, "Export label rendering requires a browser DOM.");
  }

  if (typeof FontFace === "undefined") {
    throw new PdfExportError(PdfExportErrorCode.BrowserSupport, "FontFace API is unavailable for export label rendering.");
  }
}

function buildCanvasFont(fontSize: number): string {
  return `${BBOX_LABEL_FONT_WEIGHT} ${fontSize}px "${EXPORT_LABEL_ARABIC_FONT_FAMILY}", "${EXPORT_LABEL_LATIN_FONT_FAMILY}", sans-serif`;
}

function getTextMeasureContext(): CanvasRenderingContext2D {
  if (textMeasureContext !== undefined) {
    if (!textMeasureContext) {
      throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Could not initialize export label text measurement.");
    }

    return textMeasureContext;
  }

  ensureCanvasEnvironment();
  const canvas = document.createElement("canvas");
  textMeasureContext = canvas.getContext("2d");
  if (!textMeasureContext) {
    throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Could not initialize export label text measurement.");
  }

  return textMeasureContext;
}

async function loadCanvasFontFace(family: string, sourceUrl: string): Promise<void> {
  const loadProbe = `${BBOX_LABEL_FONT_WEIGHT} 12px "${family}"`;
  if (document.fonts.check(loadProbe)) {
    return;
  }

  const face = new FontFace(family, `url(${sourceUrl})`, {
    style: "normal",
    weight: `${BBOX_LABEL_FONT_WEIGHT}`
  });

  await face.load();
  document.fonts.add(face);
}

async function ensureCanvasFontsLoaded(): Promise<void> {
  ensureCanvasEnvironment();

  if (!canvasFontLoadPromise) {
    canvasFontLoadPromise = Promise.all([
      loadCanvasFontFace(EXPORT_LABEL_ARABIC_FONT_FAMILY, EXPORT_LABEL_FONT_URLS.arabic),
      loadCanvasFontFace(EXPORT_LABEL_LATIN_FONT_FAMILY, EXPORT_LABEL_FONT_URLS.latin)
    ])
      .then(async () => {
        await document.fonts.ready;
      })
      .catch((error) => {
        canvasFontLoadPromise = null;
        throw new PdfExportError(
          PdfExportErrorCode.OverlayRendering,
          "Failed to load export label canvas fonts.",
          { cause: error }
        );
      });
  }

  await canvasFontLoadPromise;
}

function resolveTextRotationDegrees(pageSize: PdfPageSize, pageQuarterTurns: number): number {
  const origin = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, 0, 0);
  const unitX = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, 1, 0);
  const deltaX = unitX.x - origin.x;
  const deltaY = unitX.y - origin.y;
  return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
}

function createLabelCanvas(width: number, height: number): HTMLCanvasElement {
  ensureCanvasEnvironment();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  return canvas;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new PdfExportError(PdfExportErrorCode.OverlayRendering, "Failed to rasterize export label canvas."));
        return;
      }

      resolve(result);
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function renderLabelPngBytes(
  labelText: string,
  sourceRect: PdfBboxRect,
  borderWidth: number,
  textRotationQuarterTurns: number,
  direction: CanvasDirection
): Promise<Uint8Array | null> {
  await ensureCanvasFontsLoaded();

  const normalizedLabelText = normalizeExportLabelText(labelText);
  if (!normalizedLabelText) {
    return null;
  }

  const scale = EXPORT_LABEL_CANVAS_SCALE;
  const canvas = createLabelCanvas(Math.ceil(sourceRect.width * scale), Math.ceil(sourceRect.height * scale));
  const drawContext = canvas.getContext("2d");
  if (!drawContext) {
    throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Failed to initialize export label drawing surface.");
  }

  drawContext.setTransform(scale, 0, 0, scale, 0, 0);
  renderVerifiedExportLabelText({
    measureContext: getTextMeasureContext(),
    drawContext,
    labelText: normalizedLabelText,
    sourceRect,
    borderWidth,
    textRotationQuarterTurns,
    direction,
    scale,
    fillStyle: EXPORT_LABEL_TEXT_COLOR_HEX,
    buildCanvasFont
  });

  return canvasToPngBytes(canvas);
}

export async function drawExportLabelText({
  document,
  page,
  sourceRect,
  pageSize,
  pageQuarterTurns,
  borderWidth,
  languageMode,
  bbox
}: DrawExportLabelTextInput): Promise<void> {
  const presentation = resolveLanguageModePresentation(languageMode);
  const rawLabelText = formatBboxDisplayLabel(
    bbox.entityLabel,
    bbox.instanceNumber,
    presentation.numeralSystem
  );
  const normalizedLabelText = normalizeExportLabelText(rawLabelText);
  if (!normalizedLabelText) {
    return;
  }

  const textRotationQuarterTurns = normalizeBboxTextRotationQuarterTurns(bbox.textRotationQuarterTurns);
  const pngBytes = await renderLabelPngBytes(
    normalizedLabelText,
    sourceRect,
    borderWidth,
    textRotationQuarterTurns,
    presentation.direction
  );
  if (!pngBytes) {
    return;
  }

  const image = await document.embedPng(pngBytes);

  const textCoordinates: TextCoordinateContext = {
    pageSize,
    pageQuarterTurns,
    rotationDegrees: resolveTextRotationDegrees(pageSize, pageQuarterTurns)
  };

  const imageAnchor = toPdfPagePointFromDevicePoint(
    textCoordinates.pageSize,
    textCoordinates.pageQuarterTurns,
    sourceRect.x,
    sourceRect.y + sourceRect.height
  );

  page.drawImage(image, {
    x: imageAnchor.x,
    y: imageAnchor.y,
    width: sourceRect.width,
    height: sourceRect.height,
    rotate: degrees(textCoordinates.rotationDegrees)
  });
}
