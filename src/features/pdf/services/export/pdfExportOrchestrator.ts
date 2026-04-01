import { EXPORT_MIME_TYPE } from "../../constants/export";
import type { PdfExportInput, PdfExportOptions, PdfExportResult } from "../../types/export";
import { buildAnonymizedFileName } from "../../utils/exportFileName";
import { normalizePdfExportError, PdfExportError, PdfExportErrorCode } from "./exportErrors";
import { buildPageRedactionPlan } from "./redactionPlanBuilder";
import { applySecurePdfRedactions } from "./redactionMutationAdapter";
import { drawPdfExportOverlays } from "./overlayDrawingAdapter";
import { assertBrowserExportSupport, assertValidExportInput } from "./exportValidation";

export async function exportRedactedPdfWithBboxes(
  input: PdfExportInput,
  _options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  assertBrowserExportSupport();
  assertValidExportInput(input);

  const pagePlan = buildPageRedactionPlan(input.bboxes);

  try {
    const sourceBytes = new Uint8Array(await input.sourcePdfBlob.arrayBuffer());
    const redactionResult = await applySecurePdfRedactions(sourceBytes, pagePlan);
    const overlayResult =
      redactionResult.pagePlan.length > 0
        ? await drawPdfExportOverlays(redactionResult.redactedBytes, redactionResult.pagePlan)
        : {
            outputBytes: redactionResult.redactedBytes,
            skippedBboxes: []
          };
    const finalizedBytes = Uint8Array.from(overlayResult.outputBytes);

    return {
      blob: new Blob([finalizedBytes], { type: EXPORT_MIME_TYPE }),
      fileName: buildAnonymizedFileName(input.sourceFileName),
      skippedBboxes: [...redactionResult.skippedBboxes, ...overlayResult.skippedBboxes]
    };
  } catch (error) {
    const normalizedError = normalizePdfExportError(error);
    if (normalizedError instanceof PdfExportError) {
      throw normalizedError;
    }

    throw new PdfExportError(PdfExportErrorCode.Unknown, "Export failed.", { cause: error });
  }
}
