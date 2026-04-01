import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import {
  EXPORT_LABEL_FONT_FEATURES,
  EXPORT_LABEL_FONT_URLS
} from "../../constants/exportTypography";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";

export interface ExportLabelFonts {
  arabic: PDFFont;
  latin: PDFFont;
}

interface ExportLabelFontBytes {
  arabic: Uint8Array;
  latin: Uint8Array;
}

let exportLabelFontBytesPromise: Promise<ExportLabelFontBytes> | null = null;

function createFontFeatureMap(): Record<string, boolean> {
  // fontkit may append internal OpenType feature flags (for example rvrn),
  // so we must pass a mutable map instead of a frozen shared constant object.
  return { ...EXPORT_LABEL_FONT_FEATURES };
}

async function fetchFontBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new PdfExportError(
      PdfExportErrorCode.OverlayRendering,
      "Failed to load export label font assets."
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function loadExportLabelFontBytes(): Promise<ExportLabelFontBytes> {
  if (!exportLabelFontBytesPromise) {
    exportLabelFontBytesPromise = Promise.all([
      fetchFontBytes(EXPORT_LABEL_FONT_URLS.arabic),
      fetchFontBytes(EXPORT_LABEL_FONT_URLS.latin)
    ])
      .then(([arabic, latin]) => ({
        arabic,
        latin
      }))
      .catch((error) => {
        exportLabelFontBytesPromise = null;
        if (error instanceof PdfExportError) {
          throw error;
        }

        throw new PdfExportError(
          PdfExportErrorCode.OverlayRendering,
          "Could not initialize export label fonts.",
          { cause: error }
        );
      });
  }

  return exportLabelFontBytesPromise;
}

export async function embedExportLabelFonts(document: PDFDocument): Promise<ExportLabelFonts> {
  document.registerFontkit(fontkit);

  const fontBytes = await loadExportLabelFontBytes();
  const [arabic, latin] = await Promise.all([
    document.embedFont(fontBytes.arabic, {
      subset: true,
      features: createFontFeatureMap()
    }),
    document.embedFont(fontBytes.latin, {
      subset: true,
      features: createFontFeatureMap()
    })
  ]);

  return {
    arabic,
    latin
  };
}
