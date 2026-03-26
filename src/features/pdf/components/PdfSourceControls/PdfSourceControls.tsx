import { memo } from "react";
import styles from "./PdfSourceControls.module.css";
import type { PdfSourceControlsProps } from "./PdfSourceControls.types";

function PdfSourceControlsComponent({
  retrievalInputValue,
  retrievalStatus,
  canRetryRetrieval,
  hasPdf,
  manualFileInputRef,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetWorkspace,
  onRetryRetrieval,
  onManualFilePick,
  onManualFileChange
}: PdfSourceControlsProps) {
  return (
    <form
      className={styles.controlsRow}
      aria-label="PDF source controls"
      onSubmit={(event) => {
        event.preventDefault();
        onRetrieveDocument();
      }}
    >
      <label className={styles.inlineLabel} htmlFor="viewer-file-id-input">
        ID
      </label>
      <input
        id="viewer-file-id-input"
        className={styles.identifierInput}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="123456"
        value={retrievalInputValue}
        onChange={(event) => onRetrievalInputChange(event.currentTarget.value)}
        disabled={retrievalStatus === "loading"}
      />

      <button type="submit" className={styles.buttonPrimary} disabled={retrievalStatus === "loading"}>
        {retrievalStatus === "loading" ? "..." : "Retrieve"}
      </button>

      {canRetryRetrieval && retrievalStatus === "error" && (
        <button type="button" className={styles.buttonSecondary} onClick={onRetryRetrieval}>
          Retry
        </button>
      )}

      <button type="button" className={styles.buttonSecondary} onClick={onManualFilePick}>
        {hasPdf ? "Replace" : "Upload"}
      </button>

      <button type="button" className={styles.buttonSecondary} onClick={onResetWorkspace}>
        Reset
      </button>

      <input
        ref={manualFileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onManualFileChange}
        className={styles.hiddenInput}
      />
    </form>
  );
}

export const PdfSourceControls = memo(PdfSourceControlsComponent);
