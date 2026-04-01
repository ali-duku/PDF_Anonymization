import {
  PdfAnnotationSubtype,
  PdfTextAlignment,
  type PdfDocumentObject,
  type PdfEngine,
  type PdfFile,
  type PdfPageObject,
  type PdfRedactAnnoObject
} from "@embedpdf/models";
import { BBOX_FILL_COLOR } from "../../constants/bbox";
import {
  EXPORT_ENGINE_OPERATION_TIMEOUT_MS,
  EXPORT_PDFIUM_DOCUMENT_ID_PREFIX
} from "../../constants/export";
import type { PdfPageSize } from "../../types/bbox";
import { normalizePdfExportError, PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { withExportTimeout } from "./exportTimeouts";
import type { PageRedactionPlan } from "./redactionPlanBuilder";
import { assertRectWithinPage, toEngineRect } from "./coordinateConversion";
import { getPdfiumExportEngine } from "./pdfiumEngineAdapter";

type PageRedactionMode = "batch" | "localized";

let pdfiumDocumentSequence = 0;

function createPdfiumDocumentId(pageNumber: number, mode: PageRedactionMode): string {
  pdfiumDocumentSequence += 1;
  return `${EXPORT_PDFIUM_DOCUMENT_ID_PREFIX}-${mode}-p${pageNumber}-${pdfiumDocumentSequence}`;
}

function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function getPageOrThrow(document: PdfDocumentObject, pageNumber: number): PdfPageObject {
  const page = document.pages[pageNumber - 1];
  if (!page) {
    throw new PdfExportError(PdfExportErrorCode.CoordinateMapping, "A bbox references a page that does not exist.", {
      metadata: { pageNumber, pageCount: document.pageCount }
    });
  }

  return page;
}

function toPdfPageSize(page: PdfPageObject): PdfPageSize {
  return {
    width: page.size.width,
    height: page.size.height
  };
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

function createRedactionAnnotation(page: PdfPageObject, pageNumber: number, bbox: PageRedactionPlan["bboxes"][0]): PdfRedactAnnoObject {
  const pageSize = toPdfPageSize(page);
  const bboxRect = {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height
  };

  assertRectWithinPage(bboxRect, pageSize, {
    pageNumber,
    bboxId: bbox.id
  });

  const redactionRect = toEngineRect(bboxRect);

  const randomSuffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id: `redact-${bbox.id}-${randomSuffix}`,
    type: PdfAnnotationSubtype.REDACT,
    pageIndex: page.index,
    rect: redactionRect,
    segmentRects: [redactionRect],
    color: BBOX_FILL_COLOR,
    strokeColor: BBOX_FILL_COLOR,
    opacity: 1,
    textAlign: PdfTextAlignment.Center
  };
}

async function ensureDocumentEncryptionRemoved(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  pageNumber: number,
  mode: PageRedactionMode
): Promise<void> {
  const metadata = { pageNumber, mode };
  const isEncrypted = await waitForEngineOperation(
    engine.isEncrypted(document).toPromise(),
    PdfExportErrorCode.Save,
    `Timed out while checking encryption state for page ${pageNumber}.`,
    metadata
  );

  if (!isEncrypted) {
    return;
  }

  const removed = await waitForEngineOperation(
    engine.removeEncryption(document).toPromise(),
    PdfExportErrorCode.Save,
    `Timed out while removing encryption before saving page ${pageNumber}.`,
    metadata
  );

  if (!removed) {
    throw new PdfExportError(
      PdfExportErrorCode.Save,
      `Failed to remove encryption before saving page ${pageNumber}.`,
      { metadata }
    );
  }
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
    "Timed out while closing the redaction document.",
    { documentId: document.id }
  ).catch(() => {
    // Keep export flow resilient during cleanup.
  });
}

async function applyBatchPageRedactions(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  page: PdfPageObject,
  pagePlan: PageRedactionPlan
): Promise<void> {
  for (const bbox of pagePlan.bboxes) {
    const annotation = createRedactionAnnotation(page, pagePlan.pageNumber, bbox);
    await waitForEngineOperation(
      engine.createPageAnnotation(document, page, annotation).toPromise(),
      PdfExportErrorCode.RedactionApply,
      `Timed out while preparing a secure redaction annotation on page ${pagePlan.pageNumber}.`,
      { pageNumber: pagePlan.pageNumber, bboxId: bbox.id, mode: "batch" }
    );
  }

  const applied = await waitForEngineOperation(
    engine.applyAllRedactions(document, page).toPromise(),
    PdfExportErrorCode.RedactionApply,
    `Timed out while applying secure redactions on page ${pagePlan.pageNumber}.`,
    { pageNumber: pagePlan.pageNumber, mode: "batch" }
  );
  if (!applied) {
    throw new PdfExportError(
      PdfExportErrorCode.RedactionApply,
      `Secure redaction was not applied for page ${pagePlan.pageNumber}.`,
      { metadata: { pageNumber: pagePlan.pageNumber, mode: "batch" } }
    );
  }
}

async function applyLocalizedPageRedactions(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  page: PdfPageObject,
  pagePlan: PageRedactionPlan
): Promise<void> {
  for (const bbox of pagePlan.bboxes) {
    const annotation = createRedactionAnnotation(page, pagePlan.pageNumber, bbox);
    await waitForEngineOperation(
      engine.createPageAnnotation(document, page, annotation).toPromise(),
      PdfExportErrorCode.RedactionApply,
      `Timed out while preparing localized secure redaction for bbox ${bbox.id} on page ${pagePlan.pageNumber}.`,
      { pageNumber: pagePlan.pageNumber, bboxId: bbox.id, mode: "localized" }
    );

    const applied = await waitForEngineOperation(
      engine.applyAllRedactions(document, page).toPromise(),
      PdfExportErrorCode.RedactionApply,
      `Timed out while applying localized secure redaction for bbox ${bbox.id} on page ${pagePlan.pageNumber}.`,
      { pageNumber: pagePlan.pageNumber, bboxId: bbox.id, mode: "localized" }
    );

    if (!applied) {
      throw new PdfExportError(
        PdfExportErrorCode.RedactionApply,
        `Secure localized redaction failed for bbox ${bbox.id} on page ${pagePlan.pageNumber}.`,
        {
          metadata: {
            bboxId: bbox.id,
            pageNumber: pagePlan.pageNumber,
            mode: "localized"
          }
        }
      );
    }
  }
}

async function mutateSinglePage(
  sourceBytes: Uint8Array<ArrayBufferLike>,
  pagePlan: PageRedactionPlan,
  mode: PageRedactionMode
): Promise<Uint8Array<ArrayBufferLike>> {
  const engine = await getPdfiumExportEngine();
  const openFile: PdfFile = {
    id: createPdfiumDocumentId(pagePlan.pageNumber, mode),
    content: toArrayBuffer(sourceBytes)
  };

  let document: PdfDocumentObject | null = null;

  try {
    document = await waitForEngineOperation(
      engine
        .openDocumentBuffer(openFile, {
          normalizeRotation: false
        })
        .toPromise(),
      PdfExportErrorCode.EngineInitialization,
      `Timed out while opening page ${pagePlan.pageNumber} in the redaction engine.`,
      { pageNumber: pagePlan.pageNumber, mode }
    );
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error;
    }

    throw new PdfExportError(
      PdfExportErrorCode.EngineInitialization,
      "Failed to open the PDF in the secure redaction engine.",
      { cause: error, metadata: { pageNumber: pagePlan.pageNumber } }
    );
  }

  try {
    const page = getPageOrThrow(document, pagePlan.pageNumber);

    try {
      if (mode === "batch") {
        await applyBatchPageRedactions(engine, document, page, pagePlan);
      } else {
        await applyLocalizedPageRedactions(engine, document, page, pagePlan);
      }
    } catch (error) {
      const normalizedError = normalizePdfExportError(error);
      if (normalizedError.code === PdfExportErrorCode.CoordinateMapping) {
        throw normalizedError;
      }

      throw new PdfExportError(
        PdfExportErrorCode.RedactionApply,
        `Secure redaction failed on page ${pagePlan.pageNumber}.`,
        { cause: error, metadata: { pageNumber: pagePlan.pageNumber, mode } }
      );
    }

    try {
      await ensureDocumentEncryptionRemoved(engine, document, pagePlan.pageNumber, mode);

      const savedBuffer = await waitForEngineOperation(
        engine.saveAsCopy(document).toPromise(),
        PdfExportErrorCode.Save,
        `Timed out while saving secure redactions for page ${pagePlan.pageNumber}.`,
        { pageNumber: pagePlan.pageNumber, mode }
      );
      return Uint8Array.from(new Uint8Array(savedBuffer));
    } catch (error) {
      if (error instanceof PdfExportError) {
        throw error;
      }

      throw new PdfExportError(PdfExportErrorCode.Save, "Failed to persist the redacted PDF.", {
        cause: error,
        metadata: { pageNumber: pagePlan.pageNumber, mode }
      });
    }
  } finally {
    await closeDocumentQuietly(engine, document);
  }
}

export async function applySecurePdfRedactions(
  sourceBytes: Uint8Array<ArrayBufferLike>,
  pagePlan: readonly PageRedactionPlan[]
): Promise<Uint8Array<ArrayBufferLike>> {
  let workingBytes: Uint8Array<ArrayBufferLike> = Uint8Array.from(sourceBytes);

  for (const currentPlan of pagePlan) {
    if (currentPlan.bboxes.length === 0) {
      continue;
    }

    try {
      workingBytes = await mutateSinglePage(workingBytes, currentPlan, "batch");
      continue;
    } catch (batchError) {
      const normalizedBatchError = normalizePdfExportError(batchError);
      if (normalizedBatchError.code === PdfExportErrorCode.CoordinateMapping) {
        throw normalizedBatchError;
      }
    }

    try {
      workingBytes = await mutateSinglePage(workingBytes, currentPlan, "localized");
    } catch (fallbackError) {
      throw new PdfExportError(
        PdfExportErrorCode.RedactionApply,
        `Secure redaction failed on page ${currentPlan.pageNumber} after localized fallback.`,
        {
          cause: fallbackError,
          metadata: { pageNumber: currentPlan.pageNumber }
        }
      );
    }
  }

  return workingBytes;
}
