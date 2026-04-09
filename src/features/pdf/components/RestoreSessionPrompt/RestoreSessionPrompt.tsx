import { memo } from "react";
import { resolveLanguageModePresentation } from "../../../../utils/languageMode";
import { formatDigitsForNumeralSystem } from "../../utils/arabicNumerals";
import { formatSaveTimestamp } from "../../utils/saveTimestamp";
import styles from "./RestoreSessionPrompt.module.css";
import type { RestoreSessionPromptProps } from "./RestoreSessionPrompt.types";

function RestoreSessionPromptComponent({
  languageMode,
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

  const presentation = resolveLanguageModePresentation(languageMode);
  const formattedBboxCount = formatDigitsForNumeralSystem(bboxCount, presentation.numeralSystem);

  return (
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-title"
        dir={presentation.direction}
        lang={presentation.lang}
      >
        <h3 id="restore-title" className={styles.title}>
          Restore previous session?
        </h3>
        <p className={styles.description}>
          Found {formattedBboxCount} bbox{bboxCount === 1 ? "" : "es"} for {fileName}.
          {lastSavedAt ? ` Last autosave: ${formatSaveTimestamp(lastSavedAt, languageMode)}.` : ""}
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
