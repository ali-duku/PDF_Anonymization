import { degrees, rgb, type PDFDocument, type PDFPage } from "pdf-lib";
import type { AppLanguageMode } from "../../../../types/language";
import { resolveLanguageModePresentation } from "../../../../utils/languageMode";
import {
  BBOX_CSS_PIXEL_TO_PDF_UNIT,
  BBOX_LABEL_MAX_FONT_SIZE,
  BBOX_LABEL_MIN_FONT_SIZE
} from "../../constants/bbox";
import { EXPORT_LABEL_TEXT_COLOR_HEX } from "../../constants/exportTypography";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import {
  bboxTextRotationQuarterTurnsToDegrees,
  getBboxTextFitRect,
  normalizeBboxTextRotationQuarterTurns
} from "../../utils/bboxTextRotation";
import { formatBboxDisplayLabel } from "../../utils/bboxGeometry";
import { resolveBboxLabelContentBox } from "../../utils/bboxLabelLayout";
import { toPdfPagePointFromDevicePoint } from "./coordinateConversion";
import { resolveExportLabelFit } from "./exportLabelFit";
import { resolveExportLabelFontSet } from "./exportLabelFontRegistry";
import { buildExportLabelRuns, normalizeExportLabelText } from "./exportLabelRunLayout";

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

interface Point {
  x: number;
  y: number;
}

function toRadians(degreesValue: number): number {
  return (degreesValue * Math.PI) / 180;
}

function rotatePoint(point: Point, degreesValue: number): Point {
  if (degreesValue === 0) {
    return point;
  }

  const angle = toRadians(degreesValue);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine
  };
}

function resolvePdfBaselineContext(
  pageSize: PdfPageSize,
  pageQuarterTurns: number,
  lineStartDevice: Point,
  baselineUnitDevice: Point
): { unit: Point; angleDegrees: number } | null {
  const lineStartPage = toPdfPagePointFromDevicePoint(
    pageSize,
    pageQuarterTurns,
    lineStartDevice.x,
    lineStartDevice.y
  );
  const nextPointPage = toPdfPagePointFromDevicePoint(
    pageSize,
    pageQuarterTurns,
    lineStartDevice.x + baselineUnitDevice.x,
    lineStartDevice.y + baselineUnitDevice.y
  );
  const vector = {
    x: nextPointPage.x - lineStartPage.x,
    y: nextPointPage.y - lineStartPage.y
  };
  const magnitude = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return null;
  }

  const unit = {
    x: vector.x / magnitude,
    y: vector.y / magnitude
  };

  return {
    unit,
    angleDegrees: (Math.atan2(unit.y, unit.x) * 180) / Math.PI
  };
}

function parseHexColor(hexColor: string): { red: number; green: number; blue: number } {
  const normalized = hexColor.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
      : normalized;
  const safeHex = /^[0-9a-fA-F]{6}$/.test(expanded) ? expanded : "000000";

  return {
    red: Number.parseInt(safeHex.slice(0, 2), 16) / 255,
    green: Number.parseInt(safeHex.slice(2, 4), 16) / 255,
    blue: Number.parseInt(safeHex.slice(4, 6), 16) / 255
  };
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
  const textFrameRect = getBboxTextFitRect(
    {
      x: 0,
      y: 0,
      width: sourceRect.width,
      height: sourceRect.height
    },
    textRotationQuarterTurns
  );
  const tokenScale = BBOX_CSS_PIXEL_TO_PDF_UNIT;
  const contentBox = resolveBboxLabelContentBox(textFrameRect, borderWidth, tokenScale);
  if (contentBox.width <= 0 || contentBox.height <= 0) {
    return;
  }

  const fontSet = await resolveExportLabelFontSet(document);
  const runs = buildExportLabelRuns({
    labelText: normalizedLabelText,
    languageMode,
    fonts: fontSet
  });
  if (runs.length === 0) {
    return;
  }

  const fitResult = resolveExportLabelFit({
    runs,
    contentBox,
    minFontSize: BBOX_LABEL_MIN_FONT_SIZE * tokenScale,
    maxFontSize: BBOX_LABEL_MAX_FONT_SIZE * tokenScale
  });
  if (!fitResult || fitResult.fontSize <= 0 || fitResult.lineWidth <= 0) {
    return;
  }

  const contentCenter = {
    x: contentBox.x + contentBox.width * 0.5,
    y: contentBox.y + contentBox.height * 0.5
  };
  const lineStartX = contentCenter.x - fitResult.lineWidth * 0.5;
  const baselineY = contentCenter.y + (fitResult.ascent - fitResult.descent) * 0.5;
  const textFrameCenter = {
    x: textFrameRect.width * 0.5,
    y: textFrameRect.height * 0.5
  };
  const textRotationDegrees = bboxTextRotationQuarterTurnsToDegrees(textRotationQuarterTurns);
  const rotatedStartOffset = rotatePoint(
    {
      x: lineStartX - textFrameCenter.x,
      y: baselineY - textFrameCenter.y
    },
    textRotationDegrees
  );
  const sourceCenter = {
    x: sourceRect.x + sourceRect.width * 0.5,
    y: sourceRect.y + sourceRect.height * 0.5
  };
  const lineStartDevice = {
    x: sourceCenter.x + rotatedStartOffset.x,
    y: sourceCenter.y + rotatedStartOffset.y
  };
  const baselineUnitDevice = rotatePoint({ x: 1, y: 0 }, textRotationDegrees);
  const baselineContext = resolvePdfBaselineContext(
    pageSize,
    pageQuarterTurns,
    lineStartDevice,
    baselineUnitDevice
  );
  if (!baselineContext) {
    return;
  }

  const lineStartPage = toPdfPagePointFromDevicePoint(
    pageSize,
    pageQuarterTurns,
    lineStartDevice.x,
    lineStartDevice.y
  );
  const textColor = parseHexColor(EXPORT_LABEL_TEXT_COLOR_HEX);
  let consumedLineWidth = 0;
  const isRtlMode = presentation.direction === "rtl";

  for (const run of runs) {
    if (!run.text) {
      continue;
    }

    const runWidth = run.widthAtUnit * fitResult.fontSize;
    const runOffset = isRtlMode
      ? Math.max(fitResult.lineWidth - consumedLineWidth - runWidth, 0)
      : consumedLineWidth;
    const runAnchorX = lineStartPage.x + baselineContext.unit.x * runOffset;
    const runAnchorY = lineStartPage.y + baselineContext.unit.y * runOffset;
    page.drawText(run.text, {
      x: runAnchorX,
      y: runAnchorY,
      size: fitResult.fontSize,
      font: run.font.pdfFont,
      rotate: degrees(baselineContext.angleDegrees),
      color: rgb(textColor.red, textColor.green, textColor.blue)
    });

    consumedLineWidth += runWidth;
  }
}
