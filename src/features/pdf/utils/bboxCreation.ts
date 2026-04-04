import type { BboxTextRotationQuarterTurns, PdfBbox, PdfBboxRect } from "../types/bbox";
import { normalizeBboxTextRotationQuarterTurns } from "./bboxTextRotation";

interface BuildNewPdfBboxInput {
  id: string;
  pageNumber: number;
  rect: PdfBboxRect;
  pageViewRotationQuarterTurns: number;
}

export function resolveNewBboxTextRotationFromView(
  pageViewRotationQuarterTurns: number
): BboxTextRotationQuarterTurns {
  // Make newly created bbox text horizontal in the current view while storing rotation in canonical page space.
  return normalizeBboxTextRotationQuarterTurns(-pageViewRotationQuarterTurns);
}

export function buildNewPdfBbox({
  id,
  pageNumber,
  rect,
  pageViewRotationQuarterTurns
}: BuildNewPdfBboxInput): PdfBbox {
  return {
    id,
    pageNumber,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    entityLabel: "",
    instanceNumber: null,
    textRotationQuarterTurns: resolveNewBboxTextRotationFromView(pageViewRotationQuarterTurns)
  };
}
