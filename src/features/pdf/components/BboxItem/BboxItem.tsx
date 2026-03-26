import {
  memo,
  useCallback,
  useMemo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { BBOX_LABEL_SEPARATOR } from "../../constants/bbox";
import { getAdaptiveBboxLabelSizing } from "../../utils/bboxLabelSizing";
import { formatBboxDisplayLabel, getBboxDisplayLabelParts } from "../../utils/bboxGeometry";
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
  bbox,
  displayRect,
  isSelected,
  isEditing,
  entityOptions,
  onSelect,
  onStartMove,
  onStartResize,
  onDelete,
  onOpenEditor,
  onCloseEditor,
  onLabelChange,
  onInstanceNumberChange,
  onRegisterCustomLabel
}: BboxItemProps) {
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

  const labelParts = useMemo(
    () => getBboxDisplayLabelParts(bbox.entityLabel, bbox.instanceNumber),
    [bbox.entityLabel, bbox.instanceNumber]
  );

  const composedLabelText = useMemo(
    () => formatBboxDisplayLabel(labelParts.entityLabel, bbox.instanceNumber),
    [bbox.instanceNumber, labelParts.entityLabel]
  );

  const labelStyle = useMemo<CSSProperties>(() => {
    const sizing = getAdaptiveBboxLabelSizing(composedLabelText, displayRect);
    return {
      fontSize: `${sizing.fontSize}px`,
      lineHeight: `${sizing.lineHeight}`
    };
  }, [composedLabelText, displayRect.height, displayRect.width]);

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
          <span className={styles.labelContent}>
            <span className={styles.labelEntity}>{labelParts.entityLabel}</span>
            {labelParts.instanceLabel && (
              <>
                <span className={styles.labelSeparator}>{BBOX_LABEL_SEPARATOR}</span>
                <span className={styles.labelNumber}>{labelParts.instanceLabel}</span>
              </>
            )}
          </span>
        </span>
      )}

      {isSelected && !isEditing && (
        <>
          <button
            type="button"
            className={styles.deleteButton}
            data-delete
            aria-label="Delete bbox"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(bbox.id);
            }}
          >
            {"\u00D7"}
          </button>

          {RESIZE_HANDLES.map((handle) => (
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
