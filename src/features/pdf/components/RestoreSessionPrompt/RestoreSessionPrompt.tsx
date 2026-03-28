import { memo } from "react";
import { formatSaveTimestamp } from "../../utils/saveTimestamp";
import styles from "./RestoreSessionPrompt.module.css";
import type { RestoreSessionPromptProps } from "./RestoreSessionPrompt.types";

function RestoreSessionPromptComponent({
  isOpen,
  fileName,
  bboxCount,
  lastSavedAt,
  onRestore,
  onSkip
}: RestoreSessionPromptProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="restore-title">
        <h3 id="restore-title" className={styles.title}>
          Restore previous session?
        </h3>
        <p className={styles.description}>
          Found {bboxCount} bbox{bboxCount === 1 ? "" : "es"} for {fileName}.
          {lastSavedAt ? ` Last autosave: ${formatSaveTimestamp(lastSavedAt)}.` : ""}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onSkip}>
            Skip
          </button>
          <button type="button" className={styles.primaryButton} onClick={onRestore}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}

export const RestoreSessionPrompt = memo(RestoreSessionPromptComponent);
