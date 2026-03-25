import { memo } from "react";
import styles from "./TextDirectionControl.module.css";
import type { TextDirectionControlProps } from "./TextDirectionControl.types";

function TextDirectionControlComponent({ value, onToggle }: TextDirectionControlProps) {
  return (
    <div className={styles.directionControl}>
      <span className={styles.label}>Default direction</span>
      <button type="button" className={styles.toggleButton} onClick={onToggle}>
        {value.toUpperCase()}
      </button>
    </div>
  );
}

export const TextDirectionControl = memo(TextDirectionControlComponent);
