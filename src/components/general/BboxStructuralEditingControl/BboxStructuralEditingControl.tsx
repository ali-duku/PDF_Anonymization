import { memo } from "react";
import styles from "./BboxStructuralEditingControl.module.css";
import type { BboxStructuralEditingControlProps } from "./BboxStructuralEditingControl.types";

function BboxStructuralEditingControlComponent({ value, onToggle }: BboxStructuralEditingControlProps) {
  return (
    <div className={styles.control}>
      <span className={styles.label}>BBox structure</span>
      <button
        type="button"
        className={`${styles.toggleButton} ${value ? styles.toggleButtonEnabled : ""}`}
        onClick={onToggle}
        aria-pressed={value}
      >
        {value ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}

export const BboxStructuralEditingControl = memo(BboxStructuralEditingControlComponent);
