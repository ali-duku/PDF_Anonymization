import type { PdfExportSkippedBbox } from "../../types/export";

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatBboxCount(count: number): string {
  return formatCount(count, "bbox", "bboxes");
}

export function buildSkippedBboxesWarningMessage(skippedBboxes: readonly PdfExportSkippedBbox[]): string | undefined {
  if (skippedBboxes.length === 0) {
    return undefined;
  }

  const outsideBoundsCount = skippedBboxes.filter((bbox) => bbox.reason === "outside_page_bounds").length;
  const invalidPageCount = skippedBboxes.filter((bbox) => bbox.reason === "invalid_page_reference").length;
  const invalidGeometryCount = skippedBboxes.filter((bbox) => bbox.reason === "invalid_geometry").length;
  const details: string[] = [];

  if (outsideBoundsCount > 0) {
    details.push(`${formatBboxCount(outsideBoundsCount)} outside page bounds`);
  }
  if (invalidPageCount > 0) {
    details.push(`${formatBboxCount(invalidPageCount)} on invalid pages`);
  }
  if (invalidGeometryCount > 0) {
    details.push(`${formatBboxCount(invalidGeometryCount)} with invalid geometry`);
  }

  const skippedCountLabel = formatBboxCount(skippedBboxes.length);
  if (details.length === 0) {
    return `Export completed with warnings: skipped ${skippedCountLabel}.`;
  }

  return `Export completed with warnings: skipped ${skippedCountLabel} (${details.join(", ")}).`;
}
