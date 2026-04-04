import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import { BBOX_CREATE_DRAG_THRESHOLD_PX, BBOX_MIN_SIZE } from "../../constants/bbox";
import type { BboxResizeHandle } from "../../types/bbox";
import { buildRectFromPoints, moveRectWithinBounds, resizeRectWithinBounds } from "../../utils/bboxGeometry";
import {
  buildClientPointToPageProjector,
  mapViewResizeHandleToPageResizeHandle,
  pageRectToRotatedDisplayRect
} from "../../utils/pageViewTransform";
import type {
  ActiveInteraction,
  DraftCreationState,
  UseBboxOverlayInteractionsOptions,
  UseBboxOverlayInteractionsResult
} from "./useBboxOverlayInteractions.types";

export function useBboxOverlayInteractions({
  canRenderOverlay,
  pageStageRef,
  pageSize,
  displayPageBaseSize,
  pageViewRotationQuarterTurns,
  bboxesById,
  focusOverlayForKeyboard,
  onSelectBbox,
  closeEditor,
  onCreateBbox,
  onUpdateBboxRect
}: UseBboxOverlayInteractionsOptions): UseBboxOverlayInteractionsResult {
  const draftCreationRef = useRef<DraftCreationState | null>(null);
  const [draftCreation, setDraftCreation] = useState<DraftCreationState | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);

  const createProjector = useCallback(
    () =>
      buildClientPointToPageProjector(
        pageStageRef.current,
        pageSize,
        displayPageBaseSize,
        pageViewRotationQuarterTurns
      ),
    [displayPageBaseSize, pageSize, pageStageRef, pageViewRotationQuarterTurns]
  );

  const handleOverlayPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canRenderOverlay || event.button !== 0 || event.target !== event.currentTarget) {
        return;
      }

      const projector = createProjector();
      if (!projector) {
        return;
      }

      const startPoint = projector(event.clientX, event.clientY);
      event.preventDefault();
      onSelectBbox(null);
      closeEditor();

      setDraftCreation({
        projector,
        startClientX: event.clientX,
        startClientY: event.clientY,
        start: startPoint,
        current: startPoint
      });
    },
    [canRenderOverlay, closeEditor, createProjector, onSelectBbox]
  );

  const startMoveInteraction = useCallback(
    (bboxId: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canRenderOverlay || event.button !== 0) {
        return;
      }

      const targetBbox = bboxesById.get(bboxId);
      if (!targetBbox) {
        return;
      }

      const projector = createProjector();
      if (!projector) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      focusOverlayForKeyboard();
      onSelectBbox(bboxId);
      closeEditor();
      setActiveInteraction({
        type: "move",
        bboxId,
        projector,
        startPoint: projector(event.clientX, event.clientY),
        initialRect: {
          x: targetBbox.x,
          y: targetBbox.y,
          width: targetBbox.width,
          height: targetBbox.height
        }
      });
    },
    [bboxesById, canRenderOverlay, closeEditor, createProjector, focusOverlayForKeyboard, onSelectBbox]
  );

  const startResizeInteraction = useCallback(
    (bboxId: string, handle: BboxResizeHandle, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!canRenderOverlay || event.button !== 0) {
        return;
      }

      const targetBbox = bboxesById.get(bboxId);
      if (!targetBbox) {
        return;
      }

      const projector = createProjector();
      if (!projector) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      focusOverlayForKeyboard();
      onSelectBbox(bboxId);
      closeEditor();
      setActiveInteraction({
        type: "resize",
        bboxId,
        handle: mapViewResizeHandleToPageResizeHandle(handle, pageViewRotationQuarterTurns),
        projector,
        startPoint: projector(event.clientX, event.clientY),
        initialRect: {
          x: targetBbox.x,
          y: targetBbox.y,
          width: targetBbox.width,
          height: targetBbox.height
        }
      });
    },
    [
      bboxesById,
      canRenderOverlay,
      closeEditor,
      createProjector,
      focusOverlayForKeyboard,
      onSelectBbox,
      pageViewRotationQuarterTurns
    ]
  );

  useEffect(() => {
    draftCreationRef.current = draftCreation;
  }, [draftCreation]);

  useEffect(() => {
    if (!draftCreation) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const snapshot = draftCreationRef.current;
      if (!snapshot) {
        return;
      }

      setDraftCreation({
        ...snapshot,
        current: snapshot.projector(event.clientX, event.clientY)
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const snapshot = draftCreationRef.current;
      if (!snapshot) {
        return;
      }

      const distance = Math.hypot(event.clientX - snapshot.startClientX, event.clientY - snapshot.startClientY);
      if (distance >= BBOX_CREATE_DRAG_THRESHOLD_PX) {
        const endPoint = snapshot.projector(event.clientX, event.clientY);
        onCreateBbox(buildRectFromPoints(snapshot.start, endPoint, pageSize, BBOX_MIN_SIZE));
      }

      setDraftCreation(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draftCreation, onCreateBbox, pageSize]);

  useEffect(() => {
    if (!activeInteraction) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const currentPoint = activeInteraction.projector(event.clientX, event.clientY);
      const deltaX = currentPoint.x - activeInteraction.startPoint.x;
      const deltaY = currentPoint.y - activeInteraction.startPoint.y;

      const nextRect =
        activeInteraction.type === "move"
          ? moveRectWithinBounds(activeInteraction.initialRect, deltaX, deltaY, pageSize)
          : resizeRectWithinBounds(
              activeInteraction.initialRect,
              activeInteraction.handle,
              deltaX,
              deltaY,
              pageSize,
              BBOX_MIN_SIZE
            );

      onUpdateBboxRect(activeInteraction.bboxId, nextRect);
    };

    const handlePointerUp = () => {
      setActiveInteraction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeInteraction, onUpdateBboxRect, pageSize]);

  useEffect(() => {
    if (!activeInteraction && !draftCreation) {
      return;
    }

    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previousUserSelect;
    };
  }, [activeInteraction, draftCreation]);

  const draftDisplayRect = useMemo(() => {
    if (!draftCreation || !canRenderOverlay) {
      return null;
    }

    const pageRect = buildRectFromPoints(draftCreation.start, draftCreation.current, pageSize, BBOX_MIN_SIZE);
    return pageRectToRotatedDisplayRect(
      pageRect,
      pageSize,
      displayPageBaseSize,
      pageViewRotationQuarterTurns
    );
  }, [canRenderOverlay, displayPageBaseSize, draftCreation, pageSize, pageViewRotationQuarterTurns]);

  const cancelDraftCreation = useCallback(() => {
    setDraftCreation(null);
  }, []);

  return {
    draftCreation,
    activeInteraction,
    draftDisplayRect,
    cancelDraftCreation,
    handleOverlayPointerDown,
    startMoveInteraction,
    startResizeInteraction
  };
}
