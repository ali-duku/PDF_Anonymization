import { degrees, rgb, type PDFPage } from "pdf-lib";
import {
  BBOX_LABEL_ASCENT_EM,
  BBOX_LABEL_DESCENT_EM,
  BBOX_LABEL_SEPARATOR
} from "../../constants/bbox";
import {
  EXPORT_LABEL_ARABIC_INDIC_DIGIT_REGEX,
  EXPORT_LABEL_ARABIC_SCRIPT_REGEX,
  EXPORT_LABEL_TEXT_COLOR_HEX
} from "../../constants/exportTypography";
import type { PdfBboxRect, PdfPageSize } from "../../types/bbox";
import { formatBboxDisplayLabel, getBboxDisplayLabelParts } from "../../utils/bboxGeometry";
import { buildBboxLabelLayoutSpec } from "../../utils/bboxLabelLayout";
import { toPdfPagePointFromDevicePoint } from "./coordinateConversion";
import type { ExportLabelFonts } from "./exportLabelFonts";

interface DrawExportLabelTextInput {
  page: PDFPage;
  sourceRect: PdfBboxRect;
  pageSize: PdfPageSize;
  pageQuarterTurns: number;
  borderWidth: number;
  bbox: {
    entityLabel: string;
    instanceNumber: number | null;
  };
  fonts: ExportLabelFonts;
}

interface TextRun {
  text: string;
  width: number;
  font: ExportLabelFonts[keyof ExportLabelFonts];
}

type ScriptKind = "arabic" | "latin";
interface TextCoordinateContext {
  pageSize: PdfPageSize;
  pageQuarterTurns: number;
  rotationDegrees: number;
}

function toPdfRgbColor(hexColor: string) {
  const normalized = hexColor.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
      : normalized;

  return rgb(
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255
  );
}

const textColor = toPdfRgbColor(EXPORT_LABEL_TEXT_COLOR_HEX);

function containsArabicGlyphs(value: string): boolean {
  return EXPORT_LABEL_ARABIC_SCRIPT_REGEX.test(value) || EXPORT_LABEL_ARABIC_INDIC_DIGIT_REGEX.test(value);
}

function resolveScriptForCharacter(character: string): ScriptKind | null {
  if (containsArabicGlyphs(character)) {
    return "arabic";
  }

  if (/[A-Za-z0-9]/.test(character)) {
    return "latin";
  }

  return null;
}

function resolveFallbackScript(text: string, fromIndex: number): ScriptKind {
  for (let index = fromIndex + 1; index < text.length; index += 1) {
    const candidate = resolveScriptForCharacter(text[index]);
    if (candidate) {
      return candidate;
    }
  }

  return "latin";
}

function resolveScriptRuns(text: string): Array<{ text: string; script: ScriptKind }> {
  if (!text) {
    return [];
  }

  const runs: Array<{ text: string; script: ScriptKind }> = [];
  let currentScript: ScriptKind | null = null;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const strongScript: ScriptKind =
      resolveScriptForCharacter(character) ?? currentScript ?? resolveFallbackScript(text, index);

    if (!runs.length || currentScript !== strongScript) {
      runs.push({
        text: character,
        script: strongScript
      });
      currentScript = strongScript;
      continue;
    }

    runs[runs.length - 1].text += character;
  }

  return runs;
}

function resolveFontForScript(script: ScriptKind, fonts: ExportLabelFonts) {
  return script === "arabic" ? fonts.arabic : fonts.latin;
}

function resolveTextRuns(text: string, fontSize: number, fonts: ExportLabelFonts): TextRun[] {
  const scriptRuns = resolveScriptRuns(text);
  if (scriptRuns.length === 0) {
    return [];
  }

  return scriptRuns.map((scriptRun) => {
    const font = resolveFontForScript(scriptRun.script, fonts);
    return {
      text: scriptRun.text,
      width: font.widthOfTextAtSize(scriptRun.text, fontSize),
      font
    };
  });
}

function measureRunWidth(text: string, fontSize: number, fonts: ExportLabelFonts): number {
  return resolveTextRuns(text, fontSize, fonts).reduce((total, run) => total + run.width, 0);
}

function resolveTextRotationDegrees(pageSize: PdfPageSize, pageQuarterTurns: number): number {
  const origin = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, 0, 0);
  const unitX = toPdfPagePointFromDevicePoint(pageSize, pageQuarterTurns, 1, 0);
  const deltaX = unitX.x - origin.x;
  const deltaY = unitX.y - origin.y;
  return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
}

function drawRunFromDevicePoint(
  page: PDFPage,
  run: TextRun,
  xDevice: number,
  baselineYDevice: number,
  fontSize: number,
  textCoordinates: TextCoordinateContext
): void {
  const anchor = toPdfPagePointFromDevicePoint(
    textCoordinates.pageSize,
    textCoordinates.pageQuarterTurns,
    xDevice,
    baselineYDevice
  );

  page.drawText(run.text, {
    x: anchor.x,
    y: anchor.y,
    size: fontSize,
    font: run.font,
    color: textColor,
    rotate: degrees(textCoordinates.rotationDegrees)
  });
}

function drawSingleRunCentered(
  page: PDFPage,
  runs: readonly TextRun[],
  centerXDevice: number,
  baselineYDevice: number,
  fontSize: number,
  textWidth: number,
  textCoordinates: TextCoordinateContext
): void {
  let nextXDevice = centerXDevice - textWidth * 0.5;
  for (const run of runs) {
    drawRunFromDevicePoint(page, run, nextXDevice, baselineYDevice, fontSize, textCoordinates);
    nextXDevice += run.width;
  }
}

function drawDualRunRtlOrdered(
  page: PDFPage,
  entityRuns: readonly TextRun[],
  separatorRuns: readonly TextRun[],
  instanceRuns: readonly TextRun[],
  centerXDevice: number,
  baselineYDevice: number,
  fontSize: number,
  entityWidth: number,
  separatorWidth: number,
  instanceWidth: number,
  textCoordinates: TextCoordinateContext
): void {
  // Keep preview/export visual order consistent: entity appears on the left,
  // Arabic-Indic instance number appears on the right.
  const totalWidth = entityWidth + separatorWidth + instanceWidth;
  const leftEdgeDevice = centerXDevice - totalWidth * 0.5;
  let nextXDevice = leftEdgeDevice;

  for (const run of entityRuns) {
    drawRunFromDevicePoint(page, run, nextXDevice, baselineYDevice, fontSize, textCoordinates);
    nextXDevice += run.width;
  }

  for (const run of separatorRuns) {
    drawRunFromDevicePoint(page, run, nextXDevice, baselineYDevice, fontSize, textCoordinates);
    nextXDevice += run.width;
  }

  for (const run of instanceRuns) {
    drawRunFromDevicePoint(page, run, nextXDevice, baselineYDevice, fontSize, textCoordinates);
    nextXDevice += run.width;
  }
}

export function drawExportLabelText({
  page,
  sourceRect,
  pageSize,
  pageQuarterTurns,
  borderWidth,
  bbox,
  fonts
}: DrawExportLabelTextInput): void {
  const labelText = formatBboxDisplayLabel(bbox.entityLabel, bbox.instanceNumber);
  if (!labelText) {
    return;
  }

  const parts = getBboxDisplayLabelParts(bbox.entityLabel, bbox.instanceNumber);
  if (!parts.entityLabel) {
    return;
  }

  const layoutSpec = buildBboxLabelLayoutSpec({
    labelText,
    rect: { x: 0, y: 0, width: sourceRect.width, height: sourceRect.height },
    measuredWidthPerFontUnit: measureRunWidth(labelText, 1, fonts),
    measureTextMetrics: (fontSize, text) => ({
      width: measureRunWidth(text, fontSize, fonts),
      ascent: BBOX_LABEL_ASCENT_EM * fontSize,
      descent: BBOX_LABEL_DESCENT_EM * fontSize
    }),
    borderWidth
  });

  const fontSize = Math.max(1, layoutSpec.fontSize);
  const textCoordinates: TextCoordinateContext = {
    pageSize,
    pageQuarterTurns,
    rotationDegrees: resolveTextRotationDegrees(pageSize, pageQuarterTurns)
  };
  const centerXDevice = sourceRect.x + layoutSpec.centerX;
  const baselineYDevice = sourceRect.y + layoutSpec.baselineY;

  if (!parts.instanceLabel) {
    const runs = resolveTextRuns(parts.entityLabel, fontSize, fonts);
    drawSingleRunCentered(
      page,
      runs,
      centerXDevice,
      baselineYDevice,
      fontSize,
      measureRunWidth(parts.entityLabel, fontSize, fonts),
      textCoordinates
    );
    return;
  }

  const entityRuns = resolveTextRuns(parts.entityLabel, fontSize, fonts);
  const separatorRuns = resolveTextRuns(BBOX_LABEL_SEPARATOR, fontSize, fonts);
  const instanceRuns = resolveTextRuns(parts.instanceLabel, fontSize, fonts);
  const entityWidth = measureRunWidth(parts.entityLabel, fontSize, fonts);
  const separatorWidth = measureRunWidth(BBOX_LABEL_SEPARATOR, fontSize, fonts);
  const instanceWidth = measureRunWidth(parts.instanceLabel, fontSize, fonts);

  drawDualRunRtlOrdered(
    page,
    entityRuns,
    separatorRuns,
    instanceRuns,
    centerXDevice,
    baselineYDevice,
    fontSize,
    entityWidth,
    separatorWidth,
    instanceWidth,
    textCoordinates
  );
}
