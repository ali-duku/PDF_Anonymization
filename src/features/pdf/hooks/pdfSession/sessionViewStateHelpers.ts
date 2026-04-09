import {
  DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS,
  PAGE_VIEW_ROTATION_STEP
} from "../../constants/pageView";
import type { SessionViewState } from "../../types/session";
import { normalizePageViewRotationQuarterTurns } from "../../utils/pageViewTransform";

export function resolveCurrentPageViewRotation(viewState: SessionViewState, currentPage: number): number {
  return normalizePageViewRotationQuarterTurns(
    viewState.pageViewerRotations[currentPage] ?? DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS
  );
}

export function buildRotatedViewState(previous: SessionViewState, currentPage: number): SessionViewState {
  const previousRotation = resolveCurrentPageViewRotation(previous, currentPage);
  const nextRotation = normalizePageViewRotationQuarterTurns(previousRotation + PAGE_VIEW_ROTATION_STEP);
  const nextPageViewerRotations = { ...previous.pageViewerRotations };
  if (nextRotation === DEFAULT_PAGE_VIEW_ROTATION_QUARTER_TURNS) {
    delete nextPageViewerRotations[currentPage];
  } else {
    nextPageViewerRotations[currentPage] = nextRotation;
  }

  return {
    pageViewerRotations: nextPageViewerRotations
  };
}
