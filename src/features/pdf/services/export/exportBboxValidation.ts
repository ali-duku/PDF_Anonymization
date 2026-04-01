import type { PdfBbox, PdfPageSize } from "../../types/bbox";
import type { PdfExportSkippedBbox, PdfExportSkippedBboxReason } from "../../types/export";
import { getRectValidationIssue } from "./coordinateConversion";

export interface ExportPageBboxValidationResult {
  validBboxes: readonly PdfBbox[];
  skippedBboxes: readonly PdfExportSkippedBbox[];
}

function createSkippedBbox(
  bbox: Pick<PdfBbox, "id" | "pageNumber">,
  reason: PdfExportSkippedBboxReason
): PdfExportSkippedBbox {
  return {
    bboxId: bbox.id,
    pageNumber: bbox.pageNumber,
    reason
  };
}

function toSkippedReason(issue: ReturnType<typeof getRectValidationIssue>): PdfExportSkippedBboxReason {
  return issue === "outside_page_bounds" ? "outside_page_bounds" : "invalid_geometry";
}

export function markAllBboxesSkipped(
  bboxes: readonly PdfBbox[],
  reason: PdfExportSkippedBboxReason
): readonly PdfExportSkippedBbox[] {
  return bboxes.map((bbox) => createSkippedBbox(bbox, reason));
}

export function splitBboxesByPageBounds(
  bboxes: readonly PdfBbox[],
  pageSize: PdfPageSize
): ExportPageBboxValidationResult {
  const validBboxes: PdfBbox[] = [];
  const skippedBboxes: PdfExportSkippedBbox[] = [];

  for (const bbox of bboxes) {
    const issue = getRectValidationIssue(
      {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      },
      pageSize
    );

    if (issue) {
      skippedBboxes.push(createSkippedBbox(bbox, toSkippedReason(issue)));
      continue;
    }

    validBboxes.push(bbox);
  }

  return {
    validBboxes,
    skippedBboxes
  };
}
