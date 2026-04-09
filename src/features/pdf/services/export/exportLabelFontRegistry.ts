import fontkit, { type Font as FontkitFont } from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { EXPORT_LABEL_FONT_URLS } from "../../constants/exportTypography";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

export type ExportLabelFontKey = "arabic" | "latin";

export interface ExportLabelFont {
  key: ExportLabelFontKey;
  pdfFont: PDFFont;
  ascentRatio: number;
  descentRatio: number;
  supportsCodePoint: (codePoint: number) => boolean;
}

export interface ExportLabelFontSet {
  arabic: ExportLabelFont;
  latin: ExportLabelFont;
}

interface ParsedExportLabelFont {
  bytes: Uint8Array;
  ascentRatio: number;
  descentRatio: number;
  supportsCodePoint: (codePoint: number) => boolean;
}

const FONT_URL_BY_KEY: Record<ExportLabelFontKey, string> = {
  arabic: EXPORT_LABEL_FONT_URLS.arabic,
  latin: EXPORT_LABEL_FONT_URLS.latin
};

const fontBytesByUrl = new Map<string, Promise<Uint8Array>>();
const parsedFontByKey = new Map<ExportLabelFontKey, Promise<ParsedExportLabelFont>>();
const embeddedFontCache = new WeakMap<PDFDocument, Map<ExportLabelFontKey, Promise<ExportLabelFont>>>();

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveMetricRatios(font: FontkitFont): { ascentRatio: number; descentRatio: number } {
  const unitsPerEm = isFinitePositive(font.unitsPerEm) ? font.unitsPerEm : 1000;
  const fallbackAscent = isFinitePositive(font.bbox.maxY) ? font.bbox.maxY : unitsPerEm * 0.88;
  const fallbackDescent = Number.isFinite(font.bbox.minY) ? Math.abs(font.bbox.minY) : unitsPerEm * 0.38;
  const ascentUnits = isFinitePositive(font.ascent) ? font.ascent : fallbackAscent;
  const descentUnits = Number.isFinite(font.descent) ? Math.abs(font.descent) : fallbackDescent;

  return {
    ascentRatio: Math.max(ascentUnits / unitsPerEm, 0.01),
    descentRatio: Math.max(descentUnits / unitsPerEm, 0.01)
  };
}

function buildCodePointSupportCheck(font: FontkitFont): (codePoint: number) => boolean {
  return (codePoint: number) => {
    if (!Number.isFinite(codePoint) || codePoint < 0) {
      return false;
    }

    if (!font.hasGlyphForCodePoint(codePoint)) {
      return false;
    }

    const glyph = font.glyphForCodePoint(codePoint);
    return Boolean(glyph) && glyph.id !== 0;
  };
}

async function loadFontBytes(url: string): Promise<Uint8Array> {
  const existingPromise = fontBytesByUrl.get(url);
  if (existingPromise) {
    return existingPromise;
  }

  if (typeof fetch !== "function") {
    throw new PdfExportError(
      PdfExportErrorCode.BrowserSupport,
      "Export font loading requires fetch support."
    );
  }

  const nextPromise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Failed to load export label font bytes.", {
        metadata: { url, status: response.status }
      });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Loaded export label font was empty.", {
        metadata: { url }
      });
    }

    return bytes;
  })().catch((error) => {
    fontBytesByUrl.delete(url);
    throw error;
  });

  fontBytesByUrl.set(url, nextPromise);
  return nextPromise;
}

async function resolveParsedFont(key: ExportLabelFontKey): Promise<ParsedExportLabelFont> {
  const existingPromise = parsedFontByKey.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const fontUrl = FONT_URL_BY_KEY[key];
  const nextPromise = (async () => {
    try {
      const bytes = await loadFontBytes(fontUrl);
      const parsed = fontkit.create(bytes);
      const { ascentRatio, descentRatio } = resolveMetricRatios(parsed);

      return {
        bytes,
        ascentRatio,
        descentRatio,
        supportsCodePoint: buildCodePointSupportCheck(parsed)
      };
    } catch (error) {
      throw new PdfExportError(PdfExportErrorCode.OverlayRendering, "Failed to parse export label font.", {
        cause: error,
        metadata: { fontKey: key }
      });
    }
  })().catch((error) => {
    parsedFontByKey.delete(key);
    throw error;
  });

  parsedFontByKey.set(key, nextPromise);
  return nextPromise;
}

async function resolveEmbeddedFont(document: PDFDocument, key: ExportLabelFontKey): Promise<ExportLabelFont> {
  let perDocumentCache = embeddedFontCache.get(document);
  if (!perDocumentCache) {
    perDocumentCache = new Map<ExportLabelFontKey, Promise<ExportLabelFont>>();
    embeddedFontCache.set(document, perDocumentCache);
  }

  const existingPromise = perDocumentCache.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = (async () => {
    const parsed = await resolveParsedFont(key);
    document.registerFontkit(fontkit);
    const pdfFont = await document.embedFont(parsed.bytes, {
      // Keep full glyph coverage to avoid missing-letter regressions in shaped runs.
      subset: false
    });

    return {
      key,
      pdfFont,
      ascentRatio: parsed.ascentRatio,
      descentRatio: parsed.descentRatio,
      supportsCodePoint: parsed.supportsCodePoint
    };
  })().catch((error) => {
    perDocumentCache.delete(key);
    throw error;
  });

  perDocumentCache.set(key, nextPromise);
  return nextPromise;
}

export async function resolveExportLabelFontSet(document: PDFDocument): Promise<ExportLabelFontSet> {
  const [arabic, latin] = await Promise.all([
    resolveEmbeddedFont(document, "arabic"),
    resolveEmbeddedFont(document, "latin")
  ]);

  return {
    arabic,
    latin
  };
}
