import { memo } from "react";
import { resolveLanguageModePresentation } from "../../../../utils/languageMode";
import { formatSaveTimestamp } from "../../utils/saveTimestamp";
import styles from "./ViewerSaveStatus.module.css";
import type { ViewerSaveStatusProps } from "./ViewerSaveStatus.types";

function ViewerSaveStatusComponent({
  languageMode,
  hasPdf,
  saveStatus,
  lastAutosaveAt
}: ViewerSaveStatusProps) {
  if (!hasPdf) {
    return null;
  }

  const presentation = resolveLanguageModePresentation(languageMode);
  const message =
    saveStatus === "saving"
      ? "Saving session..."
      : lastAutosaveAt
        ? `Autosaved ${formatSaveTimestamp(lastAutosaveAt, languageMode)}`
        : "Autosave ready";

  return (
    <p
      className={styles.status}
      aria-live="polite"
      dir={presentation.direction}
      lang={presentation.lang}
    >
      {message}
    </p>
  );
}

export const ViewerSaveStatus = memo(ViewerSaveStatusComponent);
