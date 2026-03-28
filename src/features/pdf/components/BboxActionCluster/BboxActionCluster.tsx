import { memo, useMemo, useState, type ReactNode } from "react";
import { ActionTooltip } from "../../../../components/general/ActionTooltip/ActionTooltip";
import styles from "./BboxActionCluster.module.css";
import type {
  BboxActionClusterProps,
  BboxActionDefinition,
  BboxActionId,
  BboxActionVariant
} from "./BboxActionCluster.types";

function DeleteIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.5h15M9.5 4h5M8.3 8.3h7.4l-.8 10a1.3 1.3 0 0 1-1.3 1.2h-3.2a1.3 1.3 0 0 1-1.3-1.2zM10.3 11v6.2M13.7 11v6.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.2 7.3h9.4a1.2 1.2 0 0 1 1.2 1.2v9.3a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 17.8V8.5a1.2 1.2 0 0 1 1.2-1.2zM8.2 4.8h9.6a1.2 1.2 0 0 1 1.2 1.2v9.6M10 9.8l4.1-4.1M14.1 5.7h-2.9M14.1 5.7v2.9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 5.5h6a1.5 1.5 0 0 1 1.5 1.5v1.2h-9V7A1.5 1.5 0 0 1 9 5.5zM7.6 8.2h8.8a1.4 1.4 0 0 1 1.4 1.4v9.3a1.4 1.4 0 0 1-1.4 1.4H7.6a1.4 1.4 0 0 1-1.4-1.4V9.6a1.4 1.4 0 0 1 1.4-1.4zM10 11.3h4M10 14.1h4M10 16.9h2.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

interface ActionButtonProps {
  actionId: BboxActionId;
  label: string;
  title: string;
  variant: BboxActionVariant;
  icon: ReactNode;
  isTooltipVisible: boolean;
  onActivate: () => void;
  onTooltipShow: (actionId: BboxActionId) => void;
  onTooltipHide: () => void;
}

function ActionButton({
  actionId,
  label,
  title,
  variant,
  icon,
  isTooltipVisible,
  onActivate,
  onTooltipShow,
  onTooltipHide
}: ActionButtonProps) {
  const tooltipId = `bbox-action-tooltip-${actionId}`;

  return (
    <span className={styles.actionButtonWrap}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        title={title}
        className={`${styles.actionButton} ${styles[`${variant}Button`]}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerEnter={() => {
          onTooltipShow(actionId);
        }}
        onPointerLeave={onTooltipHide}
        onFocus={() => {
          onTooltipShow(actionId);
        }}
        onBlur={onTooltipHide}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }}
      >
        {icon}
      </button>
      <ActionTooltip id={tooltipId} label={label} visible={isTooltipVisible} />
    </span>
  );
}

const ACTION_DEFINITIONS: readonly BboxActionDefinition[] = [
  {
    id: "delete",
    label: "Delete",
    title: "Delete bbox",
    variant: "delete",
    Icon: DeleteIcon
  },
  {
    id: "duplicate",
    label: "Duplicate",
    title: "Duplicate bbox",
    variant: "duplicate",
    Icon: DuplicateIcon
  },
  {
    id: "copy",
    label: "Copy",
    title: "Copy bbox",
    variant: "copy",
    Icon: CopyIcon
  }
];

function BboxActionClusterComponent({
  isVisible,
  onDelete,
  onDuplicate,
  onCopy,
  onPointerEnter,
  onPointerLeave
}: BboxActionClusterProps) {
  const [activeTooltip, setActiveTooltip] = useState<BboxActionId | null>(null);

  const actionHandlers = useMemo(
    () => ({
      delete: onDelete,
      duplicate: onDuplicate,
      copy: onCopy
    }),
    [onCopy, onDelete, onDuplicate]
  );

  return (
    <div
      className={`${styles.cluster} ${isVisible ? styles.visible : ""}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => {
        setActiveTooltip(null);
        onPointerLeave();
      }}
    >
      {ACTION_DEFINITIONS.map((action) => {
        const IconComponent = action.Icon;
        return (
          <ActionButton
            key={action.id}
            actionId={action.id}
            label={action.label}
            title={action.title}
            variant={action.variant}
            icon={<IconComponent />}
            isTooltipVisible={activeTooltip === action.id}
            onActivate={actionHandlers[action.id]}
            onTooltipShow={setActiveTooltip}
            onTooltipHide={() => {
              setActiveTooltip((previous) => (previous === action.id ? null : previous));
            }}
          />
        );
      })}
    </div>
  );
}

export const BboxActionCluster = memo(BboxActionClusterComponent);
