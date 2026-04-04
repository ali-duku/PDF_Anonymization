import { DEFAULT_BBOX_TEXT_ROTATION_QUARTER_TURNS } from "../constants/bboxTextRotation";
import type { BboxTextRotationQuarterTurns, PdfBbox } from "../types/bbox";
import { normalizeBboxTextRotationQuarterTurns } from "./bboxTextRotation";
import { normalizePotentialMojibakeText } from "./textEncoding";

export function resolveBboxTextRotationQuarterTurns(
  textRotationQuarterTurns: number | undefined
): BboxTextRotationQuarterTurns {
  if (typeof textRotationQuarterTurns !== "number") {
    return DEFAULT_BBOX_TEXT_ROTATION_QUARTER_TURNS;
  }

  return normalizeBboxTextRotationQuarterTurns(textRotationQuarterTurns);
}

export function normalizePdfBboxState(bbox: PdfBbox): PdfBbox {
  return {
    ...bbox,
    entityLabel: normalizePotentialMojibakeText(bbox.entityLabel),
    textRotationQuarterTurns: resolveBboxTextRotationQuarterTurns(bbox.textRotationQuarterTurns)
  };
}
