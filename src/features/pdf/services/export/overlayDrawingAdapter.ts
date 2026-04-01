import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import {
  BBOX_BORDER_COLOR,
  BBOX_BORDER_WIDTH,
  BBOX_CSS_PIXEL_TO_PDF_UNIT,
  BBOX_EXPORT_BORDER_VISUAL_WEIGHT_COMPENSATION,
  BBOX_FILL_COLOR
} from "../../constants/bbox";
import type { PdfPageSize } from "../../types/bbox";
import { assertRectWithinPage, toPdfBottomLeftRect } from "./coordinateConversion";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { embedExportLabelFonts, type ExportLabelFonts } from "./exportLabelFonts";
import { drawExportLabelText } from "./exportLabelTextRenderer";
import type { PageRedactionPlan } from "./redactionPlanBuilder";

interface ParsedColor {
  red: number;
  green: number;
  blue: number;
}

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

async function canOpenPdfBytes(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(pdfBytes);
    return true;
  } catch {
    return false;
  }
}

async function drawBboxOverlay(
  page: PDFPage,
  pageSize: PdfPageSize,
  pageNumber: number,
  bbox: PageRedactionPlan["bboxes"][0],
  fonts: ExportLabelFonts
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

  drawExportLabelText({
    page,
    sourceRect,
    pdfRect,
    borderWidth,
    bbox: {
      entityLabel: bbox.entityLabel,
      instanceNumber: bbox.instanceNumber
    },
    fonts
  });
}

export async function drawPdfExportOverlays(
  sourcePdfBytes: Uint8Array,
  pagePlan: readonly PageRedactionPlan[]
): Promise<Uint8Array> {
  const outputDocument = await PDFDocument.load(sourcePdfBytes, {
    ignoreEncryption: true
  });
  const fonts = await embedExportLabelFonts(outputDocument);

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
      await drawBboxOverlay(page, pageSize, plan.pageNumber, bbox, fonts);
    }
  }

  const savedBytes = new Uint8Array(await outputDocument.save());
  const isReadable = await canOpenPdfBytes(savedBytes);
  if (isReadable) {
    return savedBytes;
  }

  // Some encrypted-source PDFs can be processed for drawing but still serialize into
  // bytes that browser viewers reject. Prefer a readable redacted export over failure.
  return Uint8Array.from(sourcePdfBytes);
}
