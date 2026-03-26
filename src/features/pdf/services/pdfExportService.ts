import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getDocument } from "pdfjs-dist";
import selectableTextFontUrl from "../assets/fonts/arial.ttf?url";
import {
  BBOX_BORDER_COLOR,
  BBOX_BORDER_WIDTH,
  BBOX_FILL_COLOR,
  BBOX_LABEL_FIT_SAFETY_INSET,
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FONT_WEIGHT,
  BBOX_LABEL_PADDING,
  BBOX_LABEL_SEPARATOR,
  BBOX_TEXT_COLOR
} from "../constants/bbox";
import {
  EXPORT_MAX_CANVAS_PIXELS,
  EXPORT_MIME_TYPE,
  EXPORT_RENDER_SCALE,
  EXPORT_SELECTABLE_TEXT_OPACITY,
  EXPORT_TEXT_REDACTION_OVERLAP_PADDING
} from "../constants/export";
import type { PdfBbox, PdfBboxRect, PdfPageSize } from "../types/bbox";
import type { PdfExportInput, PdfExportOptions, PdfExportResult } from "../types/export";
import {
  formatBboxDisplayLabel,
  getBboxDisplayLabelParts,
  pageRectToDisplayRect
} from "../utils/bboxGeometry";
import { getAdaptiveBboxLabelSizing } from "../utils/bboxLabelSizing";
import { buildAnonymizedFileName } from "../utils/exportFileName";
import {
  extractSelectableTextRuns,
  toPdfBottomLeftRect,
  type SelectableTextRun
} from "../utils/exportSelectableText";
import { configurePdfJsWorker } from "../utils/pdfWorker";

interface CanvasSurface {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

let selectableTextFontBytesPromise: Promise<Uint8Array> | null = null;

function createCanvasSurface(width: number, height: number): CanvasSurface {
  if (typeof document === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error("Unable to create export canvas context.");
  }

  return { canvas, context };
}

function drawCenteredLabelRuns(
  context: CanvasRenderingContext2D,
  entityLabel: string,
  instanceLabel: string | null,
  centerX: number,
  centerY: number
): void {
  if (!instanceLabel) {
    context.direction = "rtl";
    context.textAlign = "center";
    context.fillText(entityLabel, centerX, centerY);
    return;
  }

  // Match preview ordering by rendering entity and instance in explicit
  // left-to-right slots while keeping each run isolated as RTL text.
  const entityWidth = context.measureText(entityLabel).width;
  const separatorWidth = context.measureText(BBOX_LABEL_SEPARATOR).width;
  const instanceWidth = context.measureText(instanceLabel).width;
  const totalWidth = entityWidth + separatorWidth + instanceWidth;
  const leftEdge = centerX - totalWidth * 0.5;

  context.direction = "rtl";
  context.textAlign = "right";
  context.fillText(entityLabel, leftEdge + entityWidth, centerY);
  context.fillText(
    instanceLabel,
    leftEdge + entityWidth + separatorWidth + instanceWidth,
    centerY
  );
}

async function loadSelectableTextFontBytes(): Promise<Uint8Array> {
  if (typeof fetch !== "function") {
    throw new Error("Browser fetch API is required for export text-layer font loading.");
  }

  if (!selectableTextFontBytesPromise) {
    selectableTextFontBytesPromise = fetch(selectableTextFontUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load selectable export text-layer font.");
        }

        return new Uint8Array(await response.arrayBuffer());
      })
      .catch((error: unknown) => {
        selectableTextFontBytesPromise = null;
        throw error;
      });
  }

  return selectableTextFontBytesPromise;
}

async function waitForDocumentFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) {
    return;
  }

  try {
    await document.fonts.ready;
  } catch {
    // Keep export resilient when the browser font API is unavailable.
  }
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Failed to encode an export page.");
  }

  return new Uint8Array(await blob.arrayBuffer());
}

function drawBboxOnCanvas(
  context: CanvasRenderingContext2D,
  bbox: PdfBbox,
  exportRect: PdfBboxRect,
  pageSizeAtOne: PdfPageSize,
  exportPageSize: PdfPageSize
): void {
  context.fillStyle = BBOX_FILL_COLOR;
  context.fillRect(exportRect.x, exportRect.y, exportRect.width, exportRect.height);

  const scaleX = exportPageSize.width / pageSizeAtOne.width;
  const scaleY = exportPageSize.height / pageSizeAtOne.height;
  const averageScale = (scaleX + scaleY) * 0.5;
  const borderWidth = Math.max(BBOX_BORDER_WIDTH * averageScale, 1);
  const halfBorder = borderWidth * 0.5;

  context.strokeStyle = BBOX_BORDER_COLOR;
  context.lineWidth = borderWidth;
  context.strokeRect(
    exportRect.x + halfBorder,
    exportRect.y + halfBorder,
    Math.max(exportRect.width - borderWidth, 0),
    Math.max(exportRect.height - borderWidth, 0)
  );

  const labelText = formatBboxDisplayLabel(bbox.entityLabel, bbox.instanceNumber);
  if (!labelText) {
    return;
  }

  const labelParts = getBboxDisplayLabelParts(bbox.entityLabel, bbox.instanceNumber);
  const sizingAtPageScale = getAdaptiveBboxLabelSizing(labelText, bbox);
  const fontSize = Math.max(1, sizingAtPageScale.fontSize * averageScale);
  const labelInsetPerSide = (BBOX_LABEL_PADDING + BBOX_LABEL_FIT_SAFETY_INSET * 0.5) * averageScale;
  const labelClipRect = {
    x: exportRect.x + labelInsetPerSide,
    y: exportRect.y + labelInsetPerSide,
    width: Math.max(exportRect.width - labelInsetPerSide * 2, 0.1),
    height: Math.max(exportRect.height - labelInsetPerSide * 2, 0.1)
  };

  context.save();
  context.fillStyle = BBOX_TEXT_COLOR;
  context.textBaseline = "middle";
  context.font = `${BBOX_LABEL_FONT_WEIGHT} ${fontSize}px ${BBOX_LABEL_FONT_FAMILY}`;
  context.beginPath();
  context.rect(labelClipRect.x, labelClipRect.y, labelClipRect.width, labelClipRect.height);
  context.clip();
  drawCenteredLabelRuns(
    context,
    labelParts.entityLabel,
    labelParts.instanceLabel,
    exportRect.x + exportRect.width * 0.5,
    exportRect.y + exportRect.height * 0.5
  );
  context.restore();
}

function groupBboxesByPage(bboxes: readonly PdfBbox[]): Map<number, PdfBbox[]> {
  const grouped = new Map<number, PdfBbox[]>();

  for (const bbox of bboxes) {
    const pageBboxes = grouped.get(bbox.pageNumber);
    if (pageBboxes) {
      pageBboxes.push(bbox);
      continue;
    }
    grouped.set(bbox.pageNumber, [bbox]);
  }

  return grouped;
}

function drawSelectableTextLayer(
  runs: readonly SelectableTextRun[],
  outputPage: PDFPage,
  selectableTextFont: PDFFont
): void {
  if (runs.length === 0) {
    return;
  }

  const textColor = rgb(0, 0, 0);

  for (const run of runs) {
    try {
      outputPage.drawText(run.text, {
        x: run.x,
        y: run.y,
        size: run.fontSize,
        font: selectableTextFont,
        color: textColor,
        opacity: EXPORT_SELECTABLE_TEXT_OPACITY
      });
    } catch {
      // Skip only the failing run; keep the rest of the text layer selectable.
    }
  }
}

export async function exportFlattenedPdfWithBboxes(
  input: PdfExportInput,
  options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  configurePdfJsWorker();
  await waitForDocumentFonts();

  const renderScale = options.renderScale ?? EXPORT_RENDER_SCALE;
  const sourceData = new Uint8Array(await input.sourcePdfBlob.arrayBuffer());
  const loadingTask = getDocument({ data: sourceData });
  const sourceDocument = await loadingTask.promise;
  const bboxesByPage = groupBboxesByPage(input.bboxes);

  try {
    const outputDocument = await PDFDocument.create();
    outputDocument.registerFontkit(fontkit);
    const selectableTextFontBytes = await loadSelectableTextFontBytes();
    const selectableTextFont = await outputDocument.embedFont(selectableTextFontBytes, {
      subset: true
    });

    for (let pageNumber = 1; pageNumber <= sourceDocument.numPages; pageNumber += 1) {
      const page = await sourceDocument.getPage(pageNumber);
      const pageBboxes = bboxesByPage.get(pageNumber) ?? [];
      const viewportAtOne = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: renderScale });
      const exportPixelArea = viewport.width * viewport.height;
      if (exportPixelArea > EXPORT_MAX_CANVAS_PIXELS) {
        throw new Error("PDF page is too large for high-fidelity flattened export.");
      }

      const pageSizeAtOne: PdfPageSize = {
        width: viewportAtOne.width,
        height: viewportAtOne.height
      };
      // Keep selectable text for non-anonymized regions by rebuilding a hidden
      // text layer from source text runs after we bake page pixels.
      const redactionRectsForTextLayer = pageBboxes.map((bbox) => toPdfBottomLeftRect(bbox, pageSizeAtOne));
      const textContent = await page.getTextContent();
      const selectableTextRuns = extractSelectableTextRuns(
        textContent,
        redactionRectsForTextLayer,
        EXPORT_TEXT_REDACTION_OVERLAP_PADDING
      );

      const { canvas, context } = createCanvasSurface(viewport.width, viewport.height);
      const exportPageSize: PdfPageSize = {
        width: canvas.width,
        height: canvas.height
      };
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      const canvasScaleX = canvas.width / viewport.width;
      const canvasScaleY = canvas.height / viewport.height;

      // Render at high scale, then bake redactions into the same raster surface.
      // This keeps output flattening secure while minimizing visible quality loss.
      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        intent: "print",
        transform: [canvasScaleX, 0, 0, canvasScaleY, 0, 0]
      });
      await renderTask.promise;

      for (const bbox of pageBboxes) {
        const exportRect = pageRectToDisplayRect(bbox, pageSizeAtOne, exportPageSize);
        if (!exportRect) {
          continue;
        }

        drawBboxOnCanvas(context, bbox, exportRect, pageSizeAtOne, exportPageSize);
      }

      const pngBytes = await canvasToPngBytes(canvas);
      const embeddedImage = await outputDocument.embedPng(pngBytes);
      const outputPage = outputDocument.addPage([pageSizeAtOne.width, pageSizeAtOne.height]);
      outputPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageSizeAtOne.width,
        height: pageSizeAtOne.height
      });
      // Text opacity is zero; runs exist for selection/search but do not affect
      // the baked anonymized visual output.
      drawSelectableTextLayer(selectableTextRuns, outputPage, selectableTextFont);

      canvas.width = 0;
      canvas.height = 0;
    }

    const outputBytes = new Uint8Array(await outputDocument.save());
    return {
      blob: new Blob([outputBytes], { type: EXPORT_MIME_TYPE }),
      fileName: buildAnonymizedFileName(input.sourceFileName)
    };
  } finally {
    await sourceDocument.destroy().catch(() => {
      // Ignore source cleanup issues; export result is already produced if successful.
    });
  }
}
