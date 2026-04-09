import type {
  ImageDataLike,
  PdfDocumentObject,
  PdfEngine,
  PdfFile,
  PdfPageObject,
  PdfPageTextRuns
} from "@embedpdf/models";
import {
  EXPORT_ENGINE_OPERATION_TIMEOUT_MS,
  EXPORT_INTEGRITY_CHECK_SCALE_FACTOR,
  EXPORT_INTEGRITY_MAX_PAGES,
  EXPORT_PDFIUM_DOCUMENT_ID_PREFIX
} from "../../constants/export";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";
import { getPdfiumExportEngine } from "./pdfiumEngineAdapter";
import {
  createRedactionMask,
  evaluateDifference,
  isPageVisuallyUnsafe
} from "./redactionIntegrityMetrics";
import {
  evaluateTextRunDifference,
  isPageTextStructurallyUnsafe
} from "./redactionIntegrityTextRuns";
import type { PageRedactionPlan } from "./redactionPlanBuilder";

interface RedactionIntegrityInput {
  sourceBytes: Uint8Array<ArrayBufferLike>;
  redactedBytes: Uint8Array<ArrayBufferLike>;
  pagePlan: readonly PageRedactionPlan[];
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

async function readPageTextRuns(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  page: PdfPageObject
): Promise<PdfPageTextRuns> {
  return waitForEngineOperation(
    engine.getPageTextRuns(document, page).toPromise(),
    PdfExportErrorCode.RedactionApply,
    "Timed out while reading export integrity text runs.",
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

      const [sourceImage, redactedImage, sourceTextRuns, redactedTextRuns] = await Promise.all([
        renderPageImage(engine, sourceDocument, sourcePage),
        renderPageImage(engine, redactedDocument, redactedPage),
        readPageTextRuns(engine, sourceDocument, sourcePage),
        readPageTextRuns(engine, redactedDocument, redactedPage)
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
          reason:
            `Integrity check failed: page ${plan.pageNumber} changed outside redaction regions ` +
            `(changed=${metrics.changedPixels}, severe=${metrics.severePixels}).`
        };
      }

      const textIntegrityMetrics = evaluateTextRunDifference(
        sourceTextRuns.runs,
        redactedTextRuns.runs,
        plan.bboxes
      );
      if (isPageTextStructurallyUnsafe(textIntegrityMetrics)) {
        return {
          isSafe: false,
          reason:
            `Integrity check failed: page ${plan.pageNumber} text changed outside redaction regions ` +
            `(missing=${textIntegrityMetrics.missingCount}, unexpected=${textIntegrityMetrics.unexpectedCount}).`
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
