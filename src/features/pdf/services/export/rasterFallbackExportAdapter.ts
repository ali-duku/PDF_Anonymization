import type { ImageDataLike, PdfDocumentObject, PdfEngine, PdfFile } from "@embedpdf/models";
import { PDFDocument } from "pdf-lib";
import type { PdfBbox } from "../../types/bbox";
import {
  EXPORT_ENGINE_OPERATION_TIMEOUT_MS,
  EXPORT_PDFIUM_DOCUMENT_ID_PREFIX,
  EXPORT_RASTER_FALLBACK_SCALE_FACTOR
} from "../../constants/export";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";
import { getPdfiumExportEngine } from "./pdfiumEngineAdapter";
import type { PageRedactionPlan } from "./redactionPlanBuilder";

let rasterFallbackDocumentSequence = 0;

function createRasterFallbackDocumentId(): string {
  rasterFallbackDocumentSequence += 1;
  return `${EXPORT_PDFIUM_DOCUMENT_ID_PREFIX}-raster-fallback-${rasterFallbackDocumentSequence}`;
}

function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function waitForEngineOperation<T>(
  operationPromise: Promise<T>,
  code: PdfExportErrorCode,
  message: string,
  metadata: Record<string, unknown>
): Promise<T> {
  return withExportTimeout(
    operationPromise,
    EXPORT_ENGINE_OPERATION_TIMEOUT_MS,
    code,
    message,
    metadata
  );
}

async function closeDocumentQuietly(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject | null
): Promise<void> {
  if (!document) {
    return;
  }

  await waitForEngineOperation(
    engine.closeDocument(document).toPromise(),
    PdfExportErrorCode.Save,
    "Timed out while closing raster-fallback source document.",
    { documentId: document.id }
  ).catch(() => {
    // Keep export flow resilient during cleanup.
  });
}

function createCanvasContext(width: number, height: number): {
  putImageData: (imageData: ImageData, dx: number, dy: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  setFillStyle: (fillStyle: string) => void;
  toBlob?: (callback: BlobCallback, type?: string, quality?: any) => void;
  convertToBlob?: (options?: ImageEncodeOptions) => Promise<Blob>;
} {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new PdfExportError(
        PdfExportErrorCode.BrowserSupport,
        "Raster fallback failed: unable to create offscreen canvas context."
      );
    }

    return {
      putImageData: context.putImageData.bind(context),
      fillRect: context.fillRect.bind(context),
      setFillStyle: (fillStyle: string) => {
        context.fillStyle = fillStyle;
      },
      convertToBlob: (options?: ImageEncodeOptions) => canvas.convertToBlob(options)
    };
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new PdfExportError(
        PdfExportErrorCode.BrowserSupport,
        "Raster fallback failed: unable to create canvas context."
      );
    }

    return {
      putImageData: context.putImageData.bind(context),
      fillRect: context.fillRect.bind(context),
      setFillStyle: (fillStyle: string) => {
        context.fillStyle = fillStyle;
      },
      toBlob: canvas.toBlob.bind(canvas)
    };
  }

  throw new PdfExportError(
    PdfExportErrorCode.BrowserSupport,
    "Raster fallback failed: canvas APIs are unavailable in this browser."
  );
}

function toImageData(source: ImageDataLike): ImageData {
  return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
}

function drawRasterizedRedactionFills(
  canvasContext: ReturnType<typeof createCanvasContext>,
  imageWidth: number,
  imageHeight: number,
  pageSize: { width: number; height: number },
  bboxes: readonly PdfBbox[]
): void {
  if (bboxes.length === 0 || pageSize.width <= 0 || pageSize.height <= 0) {
    return;
  }

  const widthScale = imageWidth / pageSize.width;
  const heightScale = imageHeight / pageSize.height;
  canvasContext.setFillStyle("#FFFFFF");

  for (const bbox of bboxes) {
    const left = Math.max(0, bbox.x * widthScale);
    const top = Math.max(0, bbox.y * heightScale);
    const width = Math.max(0, bbox.width * widthScale);
    const height = Math.max(0, bbox.height * heightScale);
    if (width <= 0 || height <= 0) {
      continue;
    }

    canvasContext.fillRect(left, top, width, height);
  }
}

async function toPngBytesWithRedactionFill(
  image: ImageDataLike,
  pageSize: { width: number; height: number },
  bboxes: readonly PdfBbox[]
): Promise<Uint8Array> {
  const canvasContext = createCanvasContext(image.width, image.height);
  canvasContext.putImageData(toImageData(image), 0, 0);
  drawRasterizedRedactionFills(canvasContext, image.width, image.height, pageSize, bboxes);

  if (canvasContext.convertToBlob) {
    const blob = await canvasContext.convertToBlob({ type: "image/png", quality: 1 });
    return new Uint8Array(await blob.arrayBuffer());
  }

  if (!canvasContext.toBlob) {
    throw new PdfExportError(
      PdfExportErrorCode.BrowserSupport,
      "Raster fallback failed: unable to encode PNG output."
    );
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvasContext.toBlob!(
      (outputBlob) => {
        if (outputBlob) {
          resolve(outputBlob);
          return;
        }

        reject(
          new PdfExportError(
            PdfExportErrorCode.BrowserSupport,
            "Raster fallback failed: PNG encoding returned an empty blob."
          )
        );
      },
      "image/png",
      1
    );
  });

  return new Uint8Array(await blob.arrayBuffer());
}

export async function buildRasterFallbackBasePdf(
  sourceBytes: Uint8Array<ArrayBufferLike>,
  pagePlan: readonly PageRedactionPlan[]
): Promise<Uint8Array> {
  const engine = await getPdfiumExportEngine();
  const openFile: PdfFile = {
    id: createRasterFallbackDocumentId(),
    content: toArrayBuffer(sourceBytes)
  };
  let sourceDocument: PdfDocumentObject | null = null;

  try {
    sourceDocument = await waitForEngineOperation(
      engine
        .openDocumentBuffer(openFile, {
          normalizeRotation: false
        })
        .toPromise(),
      PdfExportErrorCode.EngineInitialization,
      "Timed out while opening PDF for raster fallback export.",
      { documentId: openFile.id }
    );

    const outputDocument = await PDFDocument.create();
    const planByPageNumber = new Map<number, PageRedactionPlan>();
    for (const plan of pagePlan) {
      planByPageNumber.set(plan.pageNumber, plan);
    }

    for (const page of sourceDocument.pages) {
      const rasterImage = await waitForEngineOperation(
        engine
          .renderPageRaw(sourceDocument, page, {
            scaleFactor: EXPORT_RASTER_FALLBACK_SCALE_FACTOR,
            withAnnotations: false,
            withForms: false,
            dpr: 1
          })
          .toPromise(),
        PdfExportErrorCode.RedactionApply,
        "Timed out while rendering a raster-fallback page.",
        { documentId: sourceDocument.id, pageNumber: page.index + 1 }
      );
      const currentPlan = planByPageNumber.get(page.index + 1);
      const pagePngBytes = await toPngBytesWithRedactionFill(
        rasterImage,
        {
          width: page.size.width,
          height: page.size.height
        },
        currentPlan?.bboxes ?? []
      );
      const embeddedImage = await outputDocument.embedPng(pagePngBytes);
      const outputPage = outputDocument.addPage([page.size.width, page.size.height]);

      outputPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: page.size.width,
        height: page.size.height
      });
    }

    return new Uint8Array(await outputDocument.save());
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error;
    }

    throw new PdfExportError(
      PdfExportErrorCode.Save,
      "Raster fallback export failed while rebuilding document pages.",
      { cause: error }
    );
  } finally {
    await closeDocumentQuietly(engine, sourceDocument);
  }
}
