import type { AppLanguageMode } from "../../../../types/language";
import { normalizeBboxLabelText } from "../../utils/bboxLabelLayout";
import type { ExportLabelFont, ExportLabelFontSet } from "./exportLabelFontRegistry";

export interface ExportLabelTextRun {
  text: string;
  font: ExportLabelFont;
  widthAtUnit: number;
}

interface BuildExportLabelRunsInput {
  labelText: string;
  languageMode: AppLanguageMode;
  fonts: ExportLabelFontSet;
}

function isWhitespace(character: string): boolean {
  return /\s/u.test(character);
}

function resolveFontPriority(
  languageMode: AppLanguageMode,
  fonts: ExportLabelFontSet
): { primary: ExportLabelFont; secondary: ExportLabelFont } {
  return languageMode === "ar"
    ? { primary: fonts.arabic, secondary: fonts.latin }
    : { primary: fonts.latin, secondary: fonts.arabic };
}

function resolveCharacterFont(
  character: string,
  activeFont: ExportLabelFont | null,
  primaryFont: ExportLabelFont,
  secondaryFont: ExportLabelFont
): ExportLabelFont {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) {
    return activeFont ?? primaryFont;
  }

  if (activeFont && activeFont.supportsCodePoint(codePoint)) {
    return activeFont;
  }

  if (primaryFont.supportsCodePoint(codePoint)) {
    return primaryFont;
  }

  if (secondaryFont.supportsCodePoint(codePoint)) {
    return secondaryFont;
  }

  return activeFont ?? primaryFont;
}

function resolveWidthAtUnit(font: ExportLabelFont, text: string): number {
  const measuredWidth = font.pdfFont.widthOfTextAtSize(text, 1);
  return Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 0;
}

export function normalizeExportLabelText(labelText: string): string {
  const singleLineText = labelText.replace(/[\t\r\n\f\v]+/g, " ").replace(/\s+/g, " ").trim();
  return normalizeBboxLabelText(singleLineText);
}

export function buildExportLabelRuns({
  labelText,
  languageMode,
  fonts
}: BuildExportLabelRunsInput): ExportLabelTextRun[] {
  const normalizedText = normalizeExportLabelText(labelText);
  if (!normalizedText) {
    return [];
  }

  const { primary, secondary } = resolveFontPriority(languageMode, fonts);
  const runs: ExportLabelTextRun[] = [];
  let activeRun: { font: ExportLabelFont; text: string } | null = null;

  for (const character of normalizedText) {
    const preferredActiveFont =
      isWhitespace(character) && activeRun ? activeRun.font : activeRun?.font ?? null;
    const characterFont = resolveCharacterFont(character, preferredActiveFont, primary, secondary);

    if (!activeRun || activeRun.font.key !== characterFont.key) {
      if (activeRun && activeRun.text) {
        runs.push({
          text: activeRun.text,
          font: activeRun.font,
          widthAtUnit: resolveWidthAtUnit(activeRun.font, activeRun.text)
        });
      }

      activeRun = {
        font: characterFont,
        text: character
      };
      continue;
    }

    activeRun.text += character;
  }

  if (activeRun && activeRun.text) {
    runs.push({
      text: activeRun.text,
      font: activeRun.font,
      widthAtUnit: resolveWidthAtUnit(activeRun.font, activeRun.text)
    });
  }

  return runs;
}
