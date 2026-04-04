import {
  BBOX_TEXT_ROTATION_DEGREES,
  BBOX_TEXT_ROTATION_SEQUENCE,
  BBOX_TEXT_ROTATION_STEP
} from "../constants/bboxTextRotation";
import type { BboxDisplayRect, BboxTextRotationQuarterTurns } from "../types/bbox";

const BBOX_TEXT_ROTATION_STEPS = BBOX_TEXT_ROTATION_SEQUENCE.length;

export function normalizeBboxTextRotationQuarterTurns(
  value: number
): BboxTextRotationQuarterTurns {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return ((Math.trunc(value) % BBOX_TEXT_ROTATION_STEPS) + BBOX_TEXT_ROTATION_STEPS) %
    BBOX_TEXT_ROTATION_STEPS as BboxTextRotationQuarterTurns;
}

export function bboxTextRotationQuarterTurnsToDegrees(value: number): number {
  return normalizeBboxTextRotationQuarterTurns(value) * BBOX_TEXT_ROTATION_DEGREES;
}

export function getNextBboxTextRotationQuarterTurns(value: number): BboxTextRotationQuarterTurns {
  return normalizeBboxTextRotationQuarterTurns(value + BBOX_TEXT_ROTATION_STEP);
}

export function isVerticalBboxTextRotation(value: number): boolean {
  const normalized = normalizeBboxTextRotationQuarterTurns(value);
  return normalized === 1 || normalized === 3;
}

export function getBboxTextFitRect(
  displayRect: BboxDisplayRect,
  textRotationQuarterTurns: number
): BboxDisplayRect {
  if (!isVerticalBboxTextRotation(textRotationQuarterTurns)) {
    return displayRect;
  }

  return {
    x: displayRect.x,
    y: displayRect.y,
    width: displayRect.height,
    height: displayRect.width
  };
}
