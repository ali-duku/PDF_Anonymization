import { memo, useCallback, useMemo, useRef, type CSSProperties } from "react";
import {
  BBOX_BORDER_COLOR,
  BBOX_BORDER_WIDTH,
  BBOX_ACTION_BUTTON_SIZE,
  BBOX_ACTION_CLUSTER_GAP,
  BBOX_ACTION_CLUSTER_Z_INDEX,
  BBOX_ACTION_GLASS_BLUR,
  BBOX_ACTION_HOVER_LIFT,
  BBOX_ACTION_ICON_SIZE,
  BBOX_ACTION_TOOLTIP_OFFSET,
  BBOX_ACTION_TOOLTIP_Z_INDEX,
  BBOX_EDITOR_MIN_WIDTH,
  BBOX_FILL_COLOR,
  BBOX_HANDLE_SIZE,
  BBOX_LABEL_EDITOR_Z_INDEX,
  BBOX_LABEL_FONT_FAMILY,
  BBOX_LABEL_FONT_WEIGHT,
  BBOX_LABEL_PADDING,
  BBOX_LAYER_Z_INDEX,
  BBOX_TEXT_COLOR
} from "../../constants/bbox";
import { useBboxOverlayKeyboardShortcuts } from "../../hooks/useBboxOverlayKeyboardShortcuts";
import { useBboxOverlayInteractions } from "../../hooks/bboxOverlay/useBboxOverlayInteractions";
import type { BboxDisplayRect, PdfBbox } from "../../types/bbox";
import { resolveBboxActionClusterOffset, type BboxActionClusterOffset } from "../../utils/bboxActionClusterPlacement";
import { isValidPageSize } from "../../utils/bboxGeometry";
import { pageRectToRotatedDisplayRect } from "../../utils/pageViewTransform";
import { BboxItem } from "../BboxItem/BboxItem";
import styles from "./BboxOverlayLayer.module.css";
import type { BboxOverlayLayerProps } from "./BboxOverlayLayer.types";

interface RenderableBbox {
  bbox: PdfBbox;
  displayRect: BboxDisplayRect;
  actionClusterOffset: BboxActionClusterOffset;
}

function BboxOverlayLayerComponent({
  languageMode,
  hasPdf,
  pageStageRef,
  displayPageSize,
  displayPageBaseSize,
  pageSize,
  pageViewRotationQuarterTurns,
  bboxes,
  selectedBboxId,
  editingBboxId,
  entityOptions,
  onSelectBbox,
  onStartEditingBbox,
  onDeleteBbox,
  onDuplicateBbox,
  onCopyBbox,
  onPasteBbox,
  canPasteBbox,
  onCreateBbox,
  onUpdateBboxRect,
  onUpdateBboxEntityLabel,
  onUpdateBboxInstanceNumber,
  onUpdateBboxTextRotation,
  onRegisterCustomEntityLabel
}: BboxOverlayLayerProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const canRenderOverlay =
    hasPdf &&
    isValidPageSize(pageSize) &&
    isValidPageSize(displayPageSize) &&
    isValidPageSize(displayPageBaseSize);

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
        const displayRect = pageRectToRotatedDisplayRect(
          bbox,
          pageSize,
          displayPageBaseSize,
          pageViewRotationQuarterTurns
        );
        if (!displayRect) {
          return null;
        }

        return {
          bbox,
          displayRect,
          actionClusterOffset: resolveBboxActionClusterOffset(displayRect, displayPageSize)
        };
      })
      .filter((item): item is RenderableBbox => Boolean(item));
  }, [
    bboxes,
    canRenderOverlay,
    displayPageBaseSize,
    displayPageSize,
    pageSize,
    pageViewRotationQuarterTurns
  ]);

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

  const overlayInteractions = useBboxOverlayInteractions({
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
  });

  useBboxOverlayKeyboardShortcuts({
    isEnabled: canRenderOverlay,
    selectedBboxId,
    editingBboxId,
    hasDraftCreation: Boolean(overlayInteractions.draftCreation),
    hasActiveInteraction: Boolean(overlayInteractions.activeInteraction),
    canPasteBbox,
    onCancelDraftCreation: overlayInteractions.cancelDraftCreation,
    onCloseEditor: closeEditor,
    onClearSelection: () => {
      onSelectBbox(null);
    },
    onDeleteBbox,
    onDuplicateBbox,
    onStartEditingBbox,
    onCopyBbox,
    onPasteBbox
  });

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
      onPointerDown={overlayInteractions.handleOverlayPointerDown}
    >
      {renderableBboxes.map(({ bbox, displayRect, actionClusterOffset }) => (
        <BboxItem
          key={bbox.id}
          languageMode={languageMode}
          bbox={bbox}
          displayRect={displayRect}
          pageViewRotationQuarterTurns={pageViewRotationQuarterTurns}
          actionClusterOffset={actionClusterOffset}
          isSelected={selectedBboxId === bbox.id}
          isEditing={editingBboxId === bbox.id}
          entityOptions={entityOptions}
          onSelect={handleSelectBbox}
          onStartMove={overlayInteractions.startMoveInteraction}
          onStartResize={overlayInteractions.startResizeInteraction}
          onDelete={onDeleteBbox}
          onDuplicate={onDuplicateBbox}
          onCopy={onCopyBbox}
          onRotateText={onUpdateBboxTextRotation}
          onOpenEditor={onStartEditingBbox}
          onCloseEditor={closeEditor}
          onLabelChange={onUpdateBboxEntityLabel}
          onInstanceNumberChange={onUpdateBboxInstanceNumber}
          onRegisterCustomLabel={onRegisterCustomEntityLabel}
        />
      ))}

      {overlayInteractions.draftDisplayRect && (
        <div
          className={styles.draftBox}
          style={{
            left: `${overlayInteractions.draftDisplayRect.x}px`,
            top: `${overlayInteractions.draftDisplayRect.y}px`,
            width: `${overlayInteractions.draftDisplayRect.width}px`,
            height: `${overlayInteractions.draftDisplayRect.height}px`
          }}
        />
      )}
    </div>
  );
}

export const BboxOverlayLayer = memo(BboxOverlayLayerComponent);
