import type {
  ImageDataLike,
  PdfDocumentObject,
  PdfEngine,
  PdfFile,
  PdfPageObject
} from "@embedpdf/models";
import {
  EXPORT_ENGINE_OPERATION_TIMEOUT_MS,
  EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX,
  EXPORT_INTEGRITY_CHECK_SCALE_FACTOR,
  EXPORT_INTEGRITY_DIFF_RATIO_THRESHOLD,
  EXPORT_INTEGRITY_MAX_PAGES,
  EXPORT_INTEGRITY_PIXEL_DIFF_THRESHOLD,
  EXPORT_INTEGRITY_SEVERE_DIFF_RATIO_THRESHOLD,
  EXPORT_INTEGRITY_SEVERE_PIXEL_DIFF_THRESHOLD,
  EXPORT_PDFIUM_DOCUMENT_ID_PREFIX
} from "../../constants/export";
import type { PdfBbox } from "../../types/bbox";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";
import { getPdfiumExportEngine } from "./pdfiumEngineAdapter";
import type { PageRedactionPlan } from "./redactionPlanBuilder";

interface RedactionIntegrityInput {
  sourceBytes: Uint8Array<ArrayBufferLike>;
  redactedBytes: Uint8Array<ArrayBufferLike>;
  pagePlan: readonly PageRedactionPlan[];
}

interface DifferenceMetrics {
  changedRatio: number;
  severeRatio: number;
}

export interface RedactionIntegrityResult {
  isSafe: boolean;
  reason?: string;
}

let integrityDocumentSequence = 0;

function createIntegrityDocumentId(suffix: "source" | "redacted"): string {
  integrityDocumentSequence += 1;
  return `${EXPORT_PDFIUM_DOCUMENT_ID_PREFIX}-integrity-${suffix}-${integrityDocumentSequence}`;
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

function getPage(document: PdfDocumentObject, pageNumber: number): PdfPageObject | null {
  return document.pages[pageNumber - 1] ?? null;
}

async function openDocument(
  engine: PdfEngine<Blob>,
  file: PdfFile
): Promise<PdfDocumentObject> {
  return waitForEngineOperation(
    engine
      .openDocumentBuffer(file, {
        normalizeRotation: false
      })
      .toPromise(),
    PdfExportErrorCode.EngineInitialization,
    "Timed out while opening a PDF for export integrity checks.",
    { documentId: file.id }
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
    "Timed out while closing an export integrity-check document.",
    { documentId: document.id }
  ).catch(() => {
    // Keep export flow resilient during cleanup.
  });
}

function resolveSamplePlans(pagePlan: readonly PageRedactionPlan[]): readonly PageRedactionPlan[] {
  const candidates = pagePlan.filter((plan) => plan.bboxes.length > 0);
  if (candidates.length <= EXPORT_INTEGRITY_MAX_PAGES) {
    return candidates;
  }

  return candidates.slice(0, EXPORT_INTEGRITY_MAX_PAGES);
}

function createRedactionMask(
  width: number,
  height: number,
  pageSize: { width: number; height: number },
  bboxes: readonly PdfBbox[]
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (width <= 0 || height <= 0 || pageSize.width <= 0 || pageSize.height <= 0) {
    return mask;
  }

  const widthScale = width / pageSize.width;
  const heightScale = height / pageSize.height;

  for (const bbox of bboxes) {
    const x0 = Math.max(
      0,
      Math.floor((bbox.x - EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * widthScale)
    );
    const y0 = Math.max(
      0,
      Math.floor((bbox.y - EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * heightScale)
    );
    const x1 = Math.min(
      width,
      Math.ceil((bbox.x + bbox.width + EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * widthScale)
    );
    const y1 = Math.min(
      height,
      Math.ceil((bbox.y + bbox.height + EXPORT_INTEGRITY_BBOX_MASK_PADDING_PX) * heightScale)
    );

    for (let y = y0; y < y1; y += 1) {
      const rowOffset = y * width;
      for (let x = x0; x < x1; x += 1) {
        mask[rowOffset + x] = 1;
      }
    }
  }

  return mask;
}

function toLuminance(red: number, green: number, blue: number): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function evaluateDifference(
  sourceImage: ImageDataLike,
  redactedImage: ImageDataLike,
  redactionMask: Uint8Array
): DifferenceMetrics {
  const { width, height } = sourceImage;
  const sourceData = sourceImage.data;
  const redactedData = redactedImage.data;
  const sampleStride = 2;
  let comparedPixels = 0;
  let changedPixels = 0;
  let severePixels = 0;

  for (let y = 0; y < height; y += sampleStride) {
    for (let x = 0; x < width; x += sampleStride) {
      const pixelOffset = y * width + x;
      if (redactionMask[pixelOffset] === 1) {
        continue;
      }

      const dataOffset = pixelOffset * 4;
      const sourceLuminance = toLuminance(
        sourceData[dataOffset],
        sourceData[dataOffset + 1],
        sourceData[dataOffset + 2]
      );
      const redactedLuminance = toLuminance(
        redactedData[dataOffset],
        redactedData[dataOffset + 1],
        redactedData[dataOffset + 2]
      );
      const delta = Math.abs(sourceLuminance - redactedLuminance);

      comparedPixels += 1;
      if (delta >= EXPORT_INTEGRITY_PIXEL_DIFF_THRESHOLD) {
        changedPixels += 1;
      }
      if (delta >= EXPORT_INTEGRITY_SEVERE_PIXEL_DIFF_THRESHOLD) {
        severePixels += 1;
      }
    }
  }

  if (comparedPixels === 0) {
    return {
      changedRatio: 0,
      severeRatio: 0
    };
  }

  return {
    changedRatio: changedPixels / comparedPixels,
    severeRatio: severePixels / comparedPixels
  };
}

function isPageVisuallyUnsafe(metrics: DifferenceMetrics): boolean {
  return (
    metrics.changedRatio > EXPORT_INTEGRITY_DIFF_RATIO_THRESHOLD ||
    metrics.severeRatio > EXPORT_INTEGRITY_SEVERE_DIFF_RATIO_THRESHOLD
  );
}

async function renderPageImage(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  page: PdfPageObject
): Promise<ImageDataLike> {
  return waitForEngineOperation(
    engine
      .renderPageRaw(document, page, {
        scaleFactor: EXPORT_INTEGRITY_CHECK_SCALE_FACTOR,
        withAnnotations: false,
        withForms: false,
        dpr: 1
      })
      .toPromise(),
    PdfExportErrorCode.RedactionApply,
    "Timed out while rendering export integrity-check preview.",
    { documentId: document.id, pageNumber: page.index + 1 }
  );
}

export async function verifyRedactionVisualIntegrity(
  input: RedactionIntegrityInput
): Promise<RedactionIntegrityResult> {
  const plansToCheck = resolveSamplePlans(input.pagePlan);
  if (plansToCheck.length === 0) {
    return { isSafe: true };
  }

  const engine = await getPdfiumExportEngine();
  let sourceDocument: PdfDocumentObject | null = null;
  let redactedDocument: PdfDocumentObject | null = null;

  try {
    sourceDocument = await openDocument(engine, {
      id: createIntegrityDocumentId("source"),
      content: toArrayBuffer(input.sourceBytes)
    });
    redactedDocument = await openDocument(engine, {
      id: createIntegrityDocumentId("redacted"),
      content: toArrayBuffer(input.redactedBytes)
    });

    for (const plan of plansToCheck) {
      const sourcePage = getPage(sourceDocument, plan.pageNumber);
      const redactedPage = getPage(redactedDocument, plan.pageNumber);
      if (!sourcePage || !redactedPage) {
        return {
          isSafe: false,
          reason: `Integrity check failed: missing page ${plan.pageNumber} in redaction output.`
        };
      }

      const [sourceImage, redactedImage] = await Promise.all([
        renderPageImage(engine, sourceDocument, sourcePage),
        renderPageImage(engine, redactedDocument, redactedPage)
      ]);
      if (
        sourceImage.width !== redactedImage.width ||
        sourceImage.height !== redactedImage.height ||
        sourceImage.width <= 0 ||
        sourceImage.height <= 0
      ) {
        return {
          isSafe: false,
          reason: `Integrity check failed: rendered page dimensions diverged on page ${plan.pageNumber}.`
        };
      }

      const redactionMask = createRedactionMask(
        sourceImage.width,
        sourceImage.height,
        {
          width: sourcePage.size.width,
          height: sourcePage.size.height
        },
        plan.bboxes
      );
      const metrics = evaluateDifference(sourceImage, redactedImage, redactionMask);
      if (isPageVisuallyUnsafe(metrics)) {
        return {
          isSafe: false,
          reason: `Integrity check failed: page ${plan.pageNumber} changed outside redaction regions.`
        };
      }
    }

    return { isSafe: true };
  } catch (error) {
    const normalizedError =
      error instanceof PdfExportError
        ? error
        : new PdfExportError(PdfExportErrorCode.RedactionApply, "Export integrity check failed.", {
            cause: error
          });
    return {
      isSafe: false,
      reason: normalizedError.message
    };
  } finally {
    await closeDocumentQuietly(engine, sourceDocument);
    await closeDocumentQuietly(engine, redactedDocument);
  }
}
