import type { PdfBbox } from "../../types/bbox";

export interface PageRedactionPlan {
  pageNumber: number;
  bboxes: readonly PdfBbox[];
}

export function buildPageRedactionPlan(bboxes: readonly PdfBbox[]): PageRedactionPlan[] {
  const grouped = new Map<number, PdfBbox[]>();

  for (const bbox of bboxes) {
    const pageBboxes = grouped.get(bbox.pageNumber);
    if (pageBboxes) {
      pageBboxes.push(bbox);
      continue;
    }
    grouped.set(bbox.pageNumber, [bbox]);
  }

  return [...grouped.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([pageNumber, pageBboxes]) => ({
      pageNumber,
      bboxes: pageBboxes
    }));
}
