import { memo } from "react";
import { formatSaveTimestamp } from "../../utils/saveTimestamp";
import styles from "./ViewerSaveStatus.module.css";
import type { ViewerSaveStatusProps } from "./ViewerSaveStatus.types";

function ViewerSaveStatusComponent({ hasPdf, saveStatus, lastAutosaveAt }: ViewerSaveStatusProps) {
  if (!hasPdf) {
    return null;
  }

  const message =
    saveStatus === "saving"
      ? "Saving session..."
      : lastAutosaveAt
        ? `Autosaved ${formatSaveTimestamp(lastAutosaveAt)}`
        : "Autosave ready";

  return (
    <p className={styles.status} aria-live="polite">
      {message}
    </p>
  );
}

export const ViewerSaveStatus = memo(ViewerSaveStatusComponent);
