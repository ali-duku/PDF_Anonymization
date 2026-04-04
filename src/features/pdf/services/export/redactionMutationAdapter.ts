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
import type { PdfExportSkippedBbox } from "../../types/export";
import { assertRectWithinPage, toEngineRect } from "./coordinateConversion";
import { PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { markAllBboxesSkipped, splitBboxesByPageBounds } from "./exportBboxValidation";
import { withExportTimeout } from "./exportTimeouts";
import { getPdfiumExportEngine } from "./pdfiumEngineAdapter";
import type { PageRedactionPlan } from "./redactionPlanBuilder";
interface ValidatedPagePlan {
  pageNumber: number;
  bboxes: PageRedactionPlan["bboxes"];
}
export interface SecureRedactionResult {
  redactedBytes: Uint8Array<ArrayBufferLike>;
  pagePlan: readonly PageRedactionPlan[];
  skippedBboxes: readonly PdfExportSkippedBbox[];
}
let pdfiumDocumentSequence = 0;
function createPdfiumDocumentId(): string {
  pdfiumDocumentSequence += 1;
  return `${EXPORT_PDFIUM_DOCUMENT_ID_PREFIX}-${pdfiumDocumentSequence}`;
}
function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}
function getPage(document: PdfDocumentObject, pageNumber: number): PdfPageObject | null {
  return document.pages[pageNumber - 1] ?? null;
}
function toDevicePageSize(page: PdfPageObject): PdfPageSize {
  // EmbedPDF redaction APIs already expose page.size in the coordinate space
  // expected by createPageAnnotation/applyRedaction for the opened document mode.
  // Re-applying rotation swaps here can desync validation from actual redaction coords.
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
function createRedactionAnnotation(
  page: PdfPageObject,
  pageNumber: number,
  bbox: PageRedactionPlan["bboxes"][0]
): PdfRedactAnnoObject {
  const devicePageSize = toDevicePageSize(page);
  const bboxRect = {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height
  };
  assertRectWithinPage(bboxRect, devicePageSize, {
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
  document: PdfDocumentObject
): Promise<void> {
  const metadata = { documentId: document.id };
  const isEncrypted = await waitForEngineOperation(
    engine.isEncrypted(document).toPromise(),
    PdfExportErrorCode.Save,
    "Timed out while checking encryption state for export.",
    metadata
  );
  if (!isEncrypted) {
    return;
  }
  const removed = await waitForEngineOperation(
    engine.removeEncryption(document).toPromise(),
    PdfExportErrorCode.Save,
    "Timed out while removing encryption before export save.",
    metadata
  );
  if (!removed) {
    throw new PdfExportError(PdfExportErrorCode.Save, "Failed to remove encryption before export save.", {
      metadata
    });
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
function collectValidatedPagePlans(
  document: PdfDocumentObject,
  pagePlan: readonly PageRedactionPlan[]
): {
  validatedPlans: readonly ValidatedPagePlan[];
  skippedBboxes: readonly PdfExportSkippedBbox[];
} {
  const validatedPlans: ValidatedPagePlan[] = [];
  const skippedBboxes: PdfExportSkippedBbox[] = [];
  for (const plan of pagePlan) {
    if (plan.bboxes.length === 0) {
      continue;
    }
    const page = getPage(document, plan.pageNumber);
    if (!page) {
      skippedBboxes.push(...markAllBboxesSkipped(plan.bboxes, "invalid_page_reference"));
      continue;
    }
    const { validBboxes, skippedBboxes: pageSkippedBboxes } = splitBboxesByPageBounds(
      plan.bboxes,
      toDevicePageSize(page)
    );
    skippedBboxes.push(...pageSkippedBboxes);
    if (validBboxes.length === 0) {
      continue;
    }
    validatedPlans.push({
      pageNumber: plan.pageNumber,
      bboxes: validBboxes
    });
  }
  return {
    validatedPlans,
    skippedBboxes
  };
}
async function applySingleBboxRedaction(
  engine: PdfEngine<Blob>,
  document: PdfDocumentObject,
  pageNumber: number,
  bbox: PageRedactionPlan["bboxes"][0]
): Promise<void> {
  const page = getPage(document, pageNumber);
  if (!page) {
    throw new PdfExportError(
      PdfExportErrorCode.CoordinateMapping,
      `A bbox references a page that no longer exists during export redaction.`,
      {
        metadata: { pageNumber, bboxId: bbox.id, pageCount: document.pageCount }
      }
    );
  }
  const annotation = createRedactionAnnotation(page, pageNumber, bbox);
  const annotationId = await waitForEngineOperation(
    engine.createPageAnnotation(document, page, annotation).toPromise(),
    PdfExportErrorCode.RedactionApply,
    `Timed out while creating secure redaction annotation for bbox ${bbox.id} on page ${pageNumber}.`,
    { pageNumber, bboxId: bbox.id }
  );
  // Apply the exact annotation we created; avoid page-wide redaction application.
  const applied = await waitForEngineOperation(
    engine.applyRedaction(document, page, annotation).toPromise(),
    PdfExportErrorCode.RedactionApply,
    `Timed out while applying secure redaction for bbox ${bbox.id} on page ${pageNumber}.`,
    { pageNumber, bboxId: bbox.id, annotationId }
  );
  if (!applied) {
    throw new PdfExportError(
      PdfExportErrorCode.RedactionApply,
      `Secure redaction failed for bbox ${bbox.id} on page ${pageNumber}.`,
      {
        metadata: {
          pageNumber,
          bboxId: bbox.id,
          annotationId
        }
      }
    );
  }
}
async function openRedactionDocument(
  sourceBytes: Uint8Array<ArrayBufferLike>
): Promise<{ engine: PdfEngine<Blob>; document: PdfDocumentObject }> {
  const engine = await getPdfiumExportEngine();
  const openFile: PdfFile = {
    id: createPdfiumDocumentId(),
    content: toArrayBuffer(sourceBytes)
  };
  try {
    const document = await waitForEngineOperation(
      engine
        .openDocumentBuffer(openFile, {
          normalizeRotation: false
        })
        .toPromise(),
      PdfExportErrorCode.EngineInitialization,
      "Timed out while opening the PDF in the secure redaction engine.",
      { documentId: openFile.id }
    );
    return { engine, document };
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error;
    }
    throw new PdfExportError(
      PdfExportErrorCode.EngineInitialization,
      "Failed to open the PDF in the secure redaction engine.",
      { cause: error, metadata: { documentId: openFile.id } }
    );
  }
}
export async function applySecurePdfRedactions(
  sourceBytes: Uint8Array<ArrayBufferLike>,
  pagePlan: readonly PageRedactionPlan[]
): Promise<SecureRedactionResult> {
  const hasAnyBboxes = pagePlan.some((plan) => plan.bboxes.length > 0);
  if (!hasAnyBboxes) {
    return {
      redactedBytes: Uint8Array.from(sourceBytes),
      pagePlan: [],
      skippedBboxes: []
    };
  }
  const { engine, document } = await openRedactionDocument(sourceBytes);
  let redactedBytes = Uint8Array.from(sourceBytes);
  try {
    const { validatedPlans, skippedBboxes } = collectValidatedPagePlans(document, pagePlan);
    for (const plan of validatedPlans) {
      for (const bbox of plan.bboxes) {
        await applySingleBboxRedaction(engine, document, plan.pageNumber, bbox);
      }
    }
    await ensureDocumentEncryptionRemoved(engine, document);
    const savedBuffer = await waitForEngineOperation(
      engine.saveAsCopy(document).toPromise(),
      PdfExportErrorCode.Save,
      "Timed out while saving secure redactions.",
      { documentId: document.id }
    );
    redactedBytes = Uint8Array.from(new Uint8Array(savedBuffer));
    return {
      redactedBytes,
      pagePlan: validatedPlans.map((plan) => ({
        pageNumber: plan.pageNumber,
        bboxes: plan.bboxes
      })),
      skippedBboxes
    };
  } catch (error) {
    if (error instanceof PdfExportError) {
      throw error;
    }
    throw new PdfExportError(PdfExportErrorCode.RedactionApply, "Secure redaction failed during export.", {
      cause: error
    });
  } finally {
    await closeDocumentQuietly(engine, document);
  }
}
