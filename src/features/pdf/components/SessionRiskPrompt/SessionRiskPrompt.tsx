import { memo } from "react";
import styles from "./SessionRiskPrompt.module.css";
import type { SessionRiskPromptProps } from "./SessionRiskPrompt.types";

function SessionRiskPromptComponent({
  isOpen,
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = "Continue"
}: SessionRiskPromptProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="risk-title">
        <h3 id="risk-title" className={styles.title}>
          {title}
        </h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.primaryButton} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SessionRiskPrompt = memo(SessionRiskPromptComponent);
