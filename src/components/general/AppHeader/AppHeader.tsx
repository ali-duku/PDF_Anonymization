import { memo } from "react";
import styles from "./AppHeader.module.css";
import type { AppHeaderProps } from "./AppHeader.types";

function AppHeaderComponent({
  appMeta,
  languageMode,
  onLanguageModeChange,
  onOpenWhatsNew,
  onOpenRestoreSession,
  onSaveSession,
  canSaveSession,
  canRestoreSession,
  saveStatus,
  onExportPdf,
  canExportPdf,
  isExportingPdf,
  exportStatusMessage
}: AppHeaderProps) {
  const saveButtonTitle = !canSaveSession
    ? "Load a PDF and make bbox changes to enable Save."
    : saveStatus === "saving"
      ? "Saving session state..."
      : "Save current bbox/session state (PDF bytes are never persisted).";

  const saveButtonLabel =
    saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save";

  const restoreButtonTitle = canRestoreSession
    ? "Restore the latest saved state for the current PDF session."
    : "No restorable state is available for the current PDF session.";

  const exportButtonTitle = isExportingPdf
    ? "Export in progress..."
    : exportStatusMessage
      ? exportStatusMessage
      : canExportPdf
        ? "Download anonymized PDF."
        : "Load a PDF and create at least one bbox to export.";

  return (
    <header className={styles.appHeader}>
      <h1 className={styles.productName}>{appMeta.name}</h1>

      <div className={styles.actions}>
        <label className={styles.languageModeField}>
          <span className={styles.languageModeLabel}>Mode</span>
          <select
            className={styles.languageModeSelect}
            value={languageMode}
            onChange={(event) => {
              onLanguageModeChange(event.currentTarget.value === "en" ? "en" : "ar");
            }}
            aria-label="Language mode"
            title="Switch presentation mode between English and Arabic."
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </label>
        <span className={styles.versionBadge} aria-label={`Version ${appMeta.version}`}>
          v{appMeta.version}
        </span>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonSecondary} ${saveStatus === "saved" ? styles.actionButtonSaved : ""}`}
          disabled={!canSaveSession || saveStatus === "saving"}
          title={saveButtonTitle}
          onClick={() => {
            void onSaveSession();
          }}
        >
          {saveButtonLabel}
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          disabled={!canRestoreSession}
          title={restoreButtonTitle}
          onClick={onOpenRestoreSession}
        >
          Restore
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          disabled={!canExportPdf || isExportingPdf}
          title={exportButtonTitle}
          onClick={() => {
            void onExportPdf();
          }}
        >
          {isExportingPdf ? "Exporting..." : "Export PDF"}
        </button>
        <button type="button" className={styles.actionButton} onClick={onOpenWhatsNew}>
          What&apos;s New
        </button>
      </div>
    </header>
  );
}

export const AppHeader = memo(AppHeaderComponent);
