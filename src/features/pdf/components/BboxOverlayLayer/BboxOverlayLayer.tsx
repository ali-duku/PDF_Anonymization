import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  BBOX_BORDER_COLOR,
  BBOX_BORDER_WIDTH,
  BBOX_ACTION_BUTTON_SIZE,
  BBOX_ACTION_CLUSTER_GAP,
  BBOX_ACTION_CLUSTER_OFFSET_X,
  BBOX_ACTION_CLUSTER_OFFSET_Y,
  BBOX_ACTION_CLUSTER_Z_INDEX,
  BBOX_ACTION_GLASS_BLUR,
  BBOX_ACTION_HOVER_LIFT,
  BBOX_ACTION_ICON_SIZE,
  BBOX_ACTION_TOOLTIP_OFFSET,
  BBOX_ACTION_TOOLTIP_Z_INDEX,
  BBOX_CREATE_DRAG_THRESHOLD_PX,
  BBOX_EDITOR_MIN_WIDTH,
  BBOX_FILL_COLOR,
  BBOX_HANDLE_SIZE,
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FONT_WEIGHT,
  BBOX_LABEL_EDITOR_Z_INDEX,
  BBOX_LABEL_PADDING,
  BBOX_LAYER_Z_INDEX,
  BBOX_MIN_SIZE,
  BBOX_TEXT_COLOR
} from "../../constants/bbox";
import type { BboxDisplayRect, BboxResizeHandle, PdfBbox, PdfBboxRect, PdfPageSize } from "../../types/bbox";
import {
  buildRectFromPoints,
  clampValue,
  isValidPageSize,
  moveRectWithinBounds,
  pageRectToDisplayRect,
  resizeRectWithinBounds,
  type PagePoint
} from "../../utils/bboxGeometry";
import { BboxItem } from "../BboxItem/BboxItem";
import styles from "./BboxOverlayLayer.module.css";
import type { BboxOverlayLayerProps } from "./BboxOverlayLayer.types";

type PagePointProjector = (clientX: number, clientY: number) => PagePoint;

interface DraftCreationState {
  projector: PagePointProjector;
  startClientX: number;
  startClientY: number;
  start: PagePoint;
  current: PagePoint;
}

interface ActiveMoveInteraction {
  type: "move";
  bboxId: string;
  projector: PagePointProjector;
  startPoint: PagePoint;
  initialRect: PdfBboxRect;
}

interface ActiveResizeInteraction {
  type: "resize";
  bboxId: string;
  handle: BboxResizeHandle;
  projector: PagePointProjector;
  startPoint: PagePoint;
  initialRect: PdfBboxRect;
}

type ActiveInteraction = ActiveMoveInteraction | ActiveResizeInteraction;

interface RenderableBbox {
  bbox: PdfBbox;
  displayRect: BboxDisplayRect;
}

function buildPagePointProjector(stageElement: HTMLElement | null, pageSize: PdfPageSize): PagePointProjector | null {
  if (!stageElement || !isValidPageSize(pageSize)) {
    return null;
  }

  const stageRect = stageElement.getBoundingClientRect();
  if (stageRect.width <= 0 || stageRect.height <= 0) {
    return null;
  }

  const scaleX = pageSize.width / stageRect.width;
  const scaleY = pageSize.height / stageRect.height;

  // Snapshot stage bounds at drag start to keep pointer mapping stable while dragging.
  return (clientX: number, clientY: number) => ({
    x: clampValue((clientX - stageRect.left) * scaleX, 0, pageSize.width),
    y: clampValue((clientY - stageRect.top) * scaleY, 0, pageSize.height)
  });
}

function BboxOverlayLayerComponent({
  hasPdf,
  pageStageRef,
  displayPageSize,
  pageSize,
  bboxes,
  selectedBboxId,
  editingBboxId,
  entityOptions,
  onSelectBbox,
  onStartEditingBbox,
  onDeleteBbox,
  onDuplicateBbox,
  onCopyBbox,
  onCreateBbox,
  onUpdateBboxRect,
  onUpdateBboxEntityLabel,
  onUpdateBboxInstanceNumber,
  onRegisterCustomEntityLabel
}: BboxOverlayLayerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const draftCreationRef = useRef<DraftCreationState | null>(null);
  const [draftCreation, setDraftCreation] = useState<DraftCreationState | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);

  const canRenderOverlay = hasPdf && isValidPageSize(pageSize) && isValidPageSize(displayPageSize);

  const bboxesById = useMemo(() => {
    const map = new Map<string, PdfBbox>();
    for (const bbox of bboxes) {
      map.set(bbox.id, bbox);
    }
    return map;
  }, [bboxes]);

  const renderableBboxes = useMemo(() => {
    if (!canRenderOverlay) {
      return [] as RenderableBbox[];
    }

    return bboxes
      .map<RenderableBbox | null>((bbox) => {
        const displayRect = pageRectToDisplayRect(bbox, pageSize, displayPageSize);
        return displayRect ? { bbox, displayRect } : null;
      })
      .filter((item): item is RenderableBbox => Boolean(item));
  }, [bboxes, canRenderOverlay, displayPageSize, pageSize]);

  const focusOverlayForKeyboard = useCallback(() => {
    const overlayElement = overlayRef.current;
    if (!overlayElement) {
      return;
    }

    try {
      overlayElement.focus({ preventScroll: true });
    } catch {
      overlayElement.focus();
    }
  }, []);

  const closeEditor = useCallback(() => {
    onStartEditingBbox(null);
  }, [onStartEditingBbox]);

  const handleSelectBbox = useCallback(
    (bboxId: string | null) => {
      focusOverlayForKeyboard();
      onSelectBbox(bboxId);
    },
    [focusOverlayForKeyboard, onSelectBbox]
  );

  const createProjector = useCallback(
    () => buildPagePointProjector(pageStageRef.current, pageSize),
    [pageSize, pageStageRef]
  );

  const handleOverlayPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canRenderOverlay || event.button !== 0) {
        return;
      }

      if (event.target !== event.currentTarget) {
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

      const startPoint = projector(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
      focusOverlayForKeyboard();
      onSelectBbox(bboxId);
      closeEditor();
      setActiveInteraction({
        type: "move",
        bboxId,
        projector,
        startPoint,
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

      const startPoint = projector(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
      focusOverlayForKeyboard();
      onSelectBbox(bboxId);
      closeEditor();
      setActiveInteraction({
        type: "resize",
        bboxId,
        handle,
        projector,
        startPoint,
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

  useEffect(() => {
    draftCreationRef.current = draftCreation;
  }, [draftCreation]);

  const isDrafting = draftCreation !== null;

  useEffect(() => {
    if (!isDrafting) {
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
      // Only commit creation after a meaningful drag to avoid accidental click-created boxes.
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
  }, [isDrafting, onCreateBbox, pageSize]);

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
    return pageRectToDisplayRect(pageRect, pageSize, displayPageSize);
  }, [canRenderOverlay, displayPageSize, draftCreation, pageSize]);

  if (!canRenderOverlay) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      style={
        {
          "--bbox-border-width": `${BBOX_BORDER_WIDTH}px`,
          "--bbox-handle-size": `${BBOX_HANDLE_SIZE}px`,
          "--bbox-action-button-size": `${BBOX_ACTION_BUTTON_SIZE}px`,
          "--bbox-action-icon-size": `${BBOX_ACTION_ICON_SIZE}px`,
          "--bbox-action-cluster-gap": `${BBOX_ACTION_CLUSTER_GAP}px`,
          "--bbox-action-cluster-offset-x": `${BBOX_ACTION_CLUSTER_OFFSET_X}px`,
          "--bbox-action-cluster-offset-y": `${BBOX_ACTION_CLUSTER_OFFSET_Y}px`,
          "--bbox-action-cluster-z-index": `${BBOX_ACTION_CLUSTER_Z_INDEX}`,
          "--bbox-action-glass-blur": `${BBOX_ACTION_GLASS_BLUR}px`,
          "--bbox-action-hover-lift": `${BBOX_ACTION_HOVER_LIFT}px`,
          "--bbox-action-tooltip-offset": `${BBOX_ACTION_TOOLTIP_OFFSET}px`,
          "--bbox-action-tooltip-z-index": `${BBOX_ACTION_TOOLTIP_Z_INDEX}`,
          "--bbox-layer-z-index": `${BBOX_LAYER_Z_INDEX}`,
          "--bbox-editor-z-index": `${BBOX_LABEL_EDITOR_Z_INDEX}`,
          "--bbox-editor-min-width": `${BBOX_EDITOR_MIN_WIDTH}px`,
          "--bbox-label-padding": `${BBOX_LABEL_PADDING}px`,
          "--bbox-label-font-family": BBOX_LABEL_FONT_FAMILY,
          "--bbox-label-font-weight": `${BBOX_LABEL_FONT_WEIGHT}`,
          "--bbox-fill-color": BBOX_FILL_COLOR,
          "--bbox-border-color": BBOX_BORDER_COLOR,
          "--bbox-text-color": BBOX_TEXT_COLOR
        } as CSSProperties
      }
      tabIndex={0}
      aria-label="BBox overlay"
      onPointerDown={handleOverlayPointerDown}
      onKeyDown={(event) => {
        if (event.key === "Escape" && draftCreation) {
          event.preventDefault();
          setDraftCreation(null);
          return;
        }

        if (event.key === "Escape" && editingBboxId) {
          event.preventDefault();
          closeEditor();
          return;
        }

        if (event.key === "Escape" && selectedBboxId) {
          event.preventDefault();
          onSelectBbox(null);
          return;
        }

        if ((event.key === "Delete" || event.key === "Backspace") && selectedBboxId && !editingBboxId) {
          event.preventDefault();
          onDeleteBbox(selectedBboxId);
          return;
        }

        if (
          event.key === "Enter" &&
          selectedBboxId &&
          !editingBboxId &&
          !draftCreation &&
          !activeInteraction
        ) {
          event.preventDefault();
          onStartEditingBbox(selectedBboxId);
        }
      }}
    >
      {renderableBboxes.map(({ bbox, displayRect }) => (
        <BboxItem
          key={bbox.id}
          bbox={bbox}
          displayRect={displayRect}
          isSelected={selectedBboxId === bbox.id}
          isEditing={editingBboxId === bbox.id}
          entityOptions={entityOptions}
          onSelect={handleSelectBbox}
          onStartMove={startMoveInteraction}
          onStartResize={startResizeInteraction}
          onDelete={onDeleteBbox}
          onDuplicate={onDuplicateBbox}
          onCopy={onCopyBbox}
          onOpenEditor={onStartEditingBbox}
          onCloseEditor={closeEditor}
          onLabelChange={onUpdateBboxEntityLabel}
          onInstanceNumberChange={onUpdateBboxInstanceNumber}
          onRegisterCustomLabel={onRegisterCustomEntityLabel}
        />
      ))}

      {draftDisplayRect && (
        <div
          className={styles.draftBox}
          style={{
            left: `${draftDisplayRect.x}px`,
            top: `${draftDisplayRect.y}px`,
            width: `${draftDisplayRect.width}px`,
            height: `${draftDisplayRect.height}px`
          }}
        />
      )}
    </div>
  );
}

export const BboxOverlayLayer = memo(BboxOverlayLayerComponent);
