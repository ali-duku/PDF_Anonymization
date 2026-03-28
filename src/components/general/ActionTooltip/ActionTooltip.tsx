import { memo } from "react";
import styles from "./ActionTooltip.module.css";
import type { ActionTooltipProps } from "./ActionTooltip.types";

function ActionTooltipComponent({ id, label, visible, placement = "top" }: ActionTooltipProps) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`${styles.tooltip} ${visible ? styles.tooltipVisible : ""}`}
      data-placement={placement}
      aria-hidden={!visible}
    >
      <span className={styles.tooltipCard}>{label}</span>
    </span>
  );
}

export const ActionTooltip = memo(ActionTooltipComponent);
