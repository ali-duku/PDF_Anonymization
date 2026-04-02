import {
  BBOX_ACTION_BUTTON_SIZE,
  BBOX_ACTION_CLUSTER_ACTION_COUNT,
  BBOX_ACTION_CLUSTER_GAP,
  BBOX_ACTION_CLUSTER_OFFSET_X,
  BBOX_ACTION_CLUSTER_SAFE_EDGE_INSET
} from "../constants/bbox";
import type { BboxDisplayRect, PdfPageSize } from "../types/bbox";
import { clampValue } from "./bboxGeometry";

export interface BboxActionClusterOffset {
  x: number;
  y: number;
}

function getActionClusterWidth(): number {
  const gapCount = Math.max(BBOX_ACTION_CLUSTER_ACTION_COUNT - 1, 0);
  return BBOX_ACTION_BUTTON_SIZE * BBOX_ACTION_CLUSTER_ACTION_COUNT + BBOX_ACTION_CLUSTER_GAP * gapCount;
}

/**
 * Keeps the action row anchored to the bbox top edge while clamping it to visible overlay bounds.
 */
export function resolveBboxActionClusterOffset(
  displayRect: BboxDisplayRect,
  overlaySize: PdfPageSize
): BboxActionClusterOffset {
  const clusterWidth = getActionClusterWidth();
  const clusterHeight = BBOX_ACTION_BUTTON_SIZE;
  const minLeft = BBOX_ACTION_CLUSTER_SAFE_EDGE_INSET;
  const maxLeft = Math.max(minLeft, overlaySize.width - clusterWidth - BBOX_ACTION_CLUSTER_SAFE_EDGE_INSET);
  const preferredRightLeft = displayRect.x + displayRect.width + BBOX_ACTION_CLUSTER_OFFSET_X;
  const preferredLeftLeft = displayRect.x - clusterWidth - BBOX_ACTION_CLUSTER_OFFSET_X;

  let absoluteLeft = preferredRightLeft;
  if (absoluteLeft > maxLeft) {
    absoluteLeft =
      preferredLeftLeft >= minLeft
        ? preferredLeftLeft
        : clampValue(preferredRightLeft, minLeft, maxLeft);
  }

  absoluteLeft = clampValue(absoluteLeft, minLeft, maxLeft);

  // Preserve top alignment unless only a bottom clamp can keep the actions fully visible.
  const maxTop = Math.max(
    0,
    overlaySize.height - clusterHeight - BBOX_ACTION_CLUSTER_SAFE_EDGE_INSET
  );
  const absoluteTop = clampValue(displayRect.y, 0, maxTop);

  return {
    x: absoluteLeft - displayRect.x,
    y: absoluteTop - displayRect.y
  };
}
