import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { BboxDisplayRect, BboxResizeHandle, PdfBbox, PdfBboxRect, PdfPageSize } from "../../types/bbox";
import type { ClientToPageProjector, PageViewPoint } from "../../utils/pageViewTransform";

export interface DraftCreationState {
  projector: ClientToPageProjector;
  startClientX: number;
  startClientY: number;
  start: PageViewPoint;
  current: PageViewPoint;
}

export interface ActiveMoveInteraction {
  type: "move";
  bboxId: string;
  projector: ClientToPageProjector;
  startPoint: PageViewPoint;
  initialRect: PdfBboxRect;
}

export interface ActiveResizeInteraction {
  type: "resize";
  bboxId: string;
  handle: BboxResizeHandle;
  projector: ClientToPageProjector;
  startPoint: PageViewPoint;
  initialRect: PdfBboxRect;
}

export type ActiveInteraction = ActiveMoveInteraction | ActiveResizeInteraction;

export interface UseBboxOverlayInteractionsOptions {
  canRenderOverlay: boolean;
  pageStageRef: RefObject<HTMLDivElement>;
  pageSize: PdfPageSize;
  displayPageBaseSize: PdfPageSize;
  pageViewRotationQuarterTurns: number;
  bboxesById: Map<string, PdfBbox>;
  focusOverlayForKeyboard: () => void;
  onSelectBbox: (bboxId: string | null) => void;
  closeEditor: () => void;
  onCreateBbox: (rect: PdfBboxRect) => void;
  onUpdateBboxRect: (bboxId: string, rect: PdfBboxRect) => void;
}

export interface UseBboxOverlayInteractionsResult {
  draftCreation: DraftCreationState | null;
  activeInteraction: ActiveInteraction | null;
  draftDisplayRect: BboxDisplayRect | null;
  cancelDraftCreation: () => void;
  handleOverlayPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  startMoveInteraction: (bboxId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  startResizeInteraction: (
    bboxId: string,
    handle: BboxResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => void;
}
