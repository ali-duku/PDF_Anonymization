import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { resolveLanguageModePresentation } from "../../../../utils/languageMode";
import { BBOX_ACTION_HOVER_HIDE_DELAY_MS } from "../../constants/bbox";
import { getAdaptiveBboxLabelSizing } from "../../utils/bboxLabelSizing";
import { formatBboxDisplayLabel, getBboxDisplayLabelParts } from "../../utils/bboxGeometry";
import {
  bboxTextRotationQuarterTurnsToDegrees,
  getNextBboxTextRotationQuarterTurns,
  getBboxTextFitRect,
  normalizeBboxTextRotationQuarterTurns
} from "../../utils/bboxTextRotation";
import { BboxActionCluster } from "../BboxActionCluster/BboxActionCluster";
import { BboxLabelEditor } from "../BboxLabelEditor/BboxLabelEditor";
import styles from "./BboxItem.module.css";
import type { BboxItemProps } from "./BboxItem.types";

const RESIZE_HANDLES = [
  { key: "n", className: styles.handleN },
  { key: "ne", className: styles.handleNe },
  { key: "e", className: styles.handleE },
  { key: "se", className: styles.handleSe },
  { key: "s", className: styles.handleS },
  { key: "sw", className: styles.handleSw },
  { key: "w", className: styles.handleW },
  { key: "nw", className: styles.handleNw }
] as const;

function isEventFromEditor(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(target.closest("[data-editor]"));
}

function BboxItemComponent({
  languageMode,
  bbox,
  displayRect,
  pageViewRotationQuarterTurns,
  actionClusterOffset,
  isSelected,
  isEditing,
  entityOptions,
  onSelect,
  onStartMove,
  onStartResize,
  onDelete,
  onDuplicate,
  onCopy,
  onRotateText,
  onOpenEditor,
  onCloseEditor,
  onLabelChange,
  onInstanceNumberChange,
  onRegisterCustomLabel
}: BboxItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hideActionsTimerRef = useRef<number | null>(null);
  const languagePresentation = useMemo(
    () => resolveLanguageModePresentation(languageMode),
    [languageMode]
  );

  const className = useMemo(
    () =>
      [
        styles.bbox,
        isSelected ? styles.selected : "",
        isEditing ? styles.editing : ""
      ]
        .filter(Boolean)
        .join(" "),
    [isEditing, isSelected]
  );
  const shouldShowActions = (isSelected || isHovered) && !isEditing;

  const labelParts = useMemo(
    () =>
      getBboxDisplayLabelParts(
        bbox.entityLabel,
        bbox.instanceNumber,
        languagePresentation.numeralSystem
      ),
    [bbox.entityLabel, bbox.instanceNumber, languagePresentation.numeralSystem]
  );

  const composedLabelText = useMemo(
    () =>
      formatBboxDisplayLabel(
        labelParts.entityLabel,
        bbox.instanceNumber,
        languagePresentation.numeralSystem
      ),
    [bbox.instanceNumber, labelParts.entityLabel, languagePresentation.numeralSystem]
  );
  const textRotationQuarterTurns = normalizeBboxTextRotationQuarterTurns(bbox.textRotationQuarterTurns);
  const displayTextRotationQuarterTurns = normalizeBboxTextRotationQuarterTurns(
    textRotationQuarterTurns + pageViewRotationQuarterTurns
  );
  const textRotationDegrees = bboxTextRotationQuarterTurnsToDegrees(displayTextRotationQuarterTurns);
  const labelFitRect = useMemo(
    () => getBboxTextFitRect(displayRect, displayTextRotationQuarterTurns),
    [displayRect, displayTextRotationQuarterTurns]
  );

  const labelStyle = useMemo<CSSProperties>(() => {
    const sizing = getAdaptiveBboxLabelSizing(composedLabelText, labelFitRect);
    return {
      fontSize: `${sizing.fontSize}px`,
      lineHeight: `${sizing.lineHeight}`
    };
  }, [composedLabelText, labelFitRect]);

  const labelContentWrapStyle = useMemo<CSSProperties>(
    () => ({
      transform: `rotate(${textRotationDegrees}deg)`
    }),
    [textRotationDegrees]
  );

  const actionClusterStyle = useMemo<CSSProperties>(
    () => ({
      left: `${actionClusterOffset.x}px`,
      top: `${actionClusterOffset.y}px`
    }),
    [actionClusterOffset.x, actionClusterOffset.y]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || isEventFromEditor(event.target)) {
        return;
      }

      onSelect(bbox.id);
      if (isEditing) {
        return;
      }

      onStartMove(bbox.id, event);
    },
    [bbox.id, isEditing, onSelect, onStartMove]
  );

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isEventFromEditor(event.target)) {
        return;
      }

      event.stopPropagation();
      onSelect(bbox.id);
      onOpenEditor(bbox.id);
    },
    [bbox.id, onOpenEditor, onSelect]
  );

  const cancelHideActionsTimer = useCallback(() => {
    if (hideActionsTimerRef.current === null) {
      return;
    }
    window.clearTimeout(hideActionsTimerRef.current);
    hideActionsTimerRef.current = null;
  }, []);

  const showActions = useCallback(() => {
    cancelHideActionsTimer();
    setIsHovered(true);
  }, [cancelHideActionsTimer]);

  const scheduleHideActions = useCallback(() => {
    cancelHideActionsTimer();
    hideActionsTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
      hideActionsTimerRef.current = null;
    }, BBOX_ACTION_HOVER_HIDE_DELAY_MS);
  }, [cancelHideActionsTimer]);

  useEffect(() => {
    return () => {
      cancelHideActionsTimer();
    };
  }, [cancelHideActionsTimer]);

  return (
    <div
      className={className}
      style={{
        left: `${displayRect.x}px`,
        top: `${displayRect.y}px`,
        width: `${displayRect.width}px`,
        height: `${displayRect.height}px`
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={showActions}
      onPointerLeave={scheduleHideActions}
      onDoubleClick={handleDoubleClick}
      onClick={(event) => {
        if (isEventFromEditor(event.target)) {
          return;
        }

        event.stopPropagation();
        onSelect(bbox.id);
      }}
    >
      {labelParts.entityLabel && (
        <span className={styles.label} style={labelStyle}>
          <span className={styles.labelContentWrap} style={labelContentWrapStyle}>
            <span
              className={styles.labelContent}
              dir={languagePresentation.direction}
              lang={languagePresentation.lang}
            >
              {composedLabelText}
            </span>
          </span>
        </span>
      )}

      {!isEditing && (
        <>
          <BboxActionCluster
            isVisible={shouldShowActions}
            placementStyle={actionClusterStyle}
            onDelete={() => onDelete(bbox.id)}
            onDuplicate={() => onDuplicate(bbox.id)}
            onCopy={() => onCopy(bbox.id)}
            onRotateText={() =>
              onRotateText(bbox.id, getNextBboxTextRotationQuarterTurns(textRotationQuarterTurns))
            }
            onPointerEnter={showActions}
            onPointerLeave={scheduleHideActions}
          />

          {isSelected &&
            RESIZE_HANDLES.map((handle) => (
            <button
              key={handle.key}
              type="button"
              className={`${styles.resizeHandle} ${handle.className}`}
              data-handle={handle.key}
              aria-label={`Resize ${handle.key}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelect(bbox.id);
                onStartResize(bbox.id, handle.key, event);
              }}
            />
            ))}
        </>
      )}

      {isEditing && (
        <BboxLabelEditor
          languageMode={languageMode}
          entityLabel={bbox.entityLabel}
          instanceNumber={bbox.instanceNumber}
          options={entityOptions}
          onEntityLabelChange={(nextLabel) => onLabelChange(bbox.id, nextLabel)}
          onInstanceNumberChange={(nextNumber) => onInstanceNumberChange(bbox.id, nextNumber)}
          onRegisterCustomOption={onRegisterCustomLabel}
          onClose={onCloseEditor}
        />
      )}
    </div>
  );
}

export const BboxItem = memo(BboxItemComponent);
