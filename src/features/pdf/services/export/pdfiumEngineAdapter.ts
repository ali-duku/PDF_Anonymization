import type { PdfEngine } from "@embedpdf/models";
import { createPdfiumEngine } from "@embedpdf/engines/pdfium-direct-engine";
import pdfiumWasmUrl from "@embedpdf/pdfium/pdfium.wasm?url";
import { EXPORT_ENGINE_INIT_TIMEOUT_MS } from "../../constants/export";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";

let pdfiumEnginePromise: Promise<PdfEngine<Blob>> | null = null;

export async function getPdfiumExportEngine(): Promise<PdfEngine<Blob>> {
  if (!pdfiumEnginePromise) {
    const enginePromise = createPdfiumEngine(pdfiumWasmUrl, {
      encoderPoolSize: 0,
      fontFallback: {
        // Keep export fully local and avoid any external font fetches.
        fonts: {}
      }
    });

    pdfiumEnginePromise = withExportTimeout(
      enginePromise,
      EXPORT_ENGINE_INIT_TIMEOUT_MS,
      PdfExportErrorCode.EngineInitialization,
      "Timed out while initializing the PDF redaction engine."
    ).catch((error: unknown) => {
      pdfiumEnginePromise = null;

      if (error instanceof PdfExportError) {
        throw error;
      }

      throw new PdfExportError(
        PdfExportErrorCode.EngineInitialization,
        "Failed to initialize the PDF redaction engine.",
        { cause: error }
      );
    });
  }

  return pdfiumEnginePromise;
}
