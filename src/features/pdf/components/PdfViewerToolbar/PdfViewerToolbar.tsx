import { memo } from "react";
import { ToolbarIconButton } from "../../../../components/general/ToolbarIconButton/ToolbarIconButton";
import { PageViewRotationButton } from "../PageViewRotationButton/PageViewRotationButton";
import { PdfSourceControls } from "../PdfSourceControls/PdfSourceControls";
import styles from "./PdfViewerToolbar.module.css";
import type { PdfViewerToolbarProps } from "./PdfViewerToolbar.types";

function PreviousPageIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function NextPageIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 7H4.8v3.6M5 10.6A7.2 7.2 0 1 1 7.2 16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.5 7h3.7v3.6M19 10.6A7.2 7.2 0 1 0 16.8 16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PdfViewerToolbarComponent({
  hasPdf,
  retrievalInputValue,
  retrievalStatus,
  canRetryRetrieval,
  manualFileInputRef,
  currentPage,
  totalPages,
  zoom,
  currentPageRotationQuarterTurns,
  currentPageRotationDegrees,
  canUndo,
  canRedo,
  canPaste,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetWorkspace,
  onRetryRetrieval,
  onManualFilePick,
  onManualFileChange,
  onMovePage,
  onPageInput,
  onRotatePageView,
  onZoomOut,
  onZoomIn,
  onFitToWidth,
  onUndo,
  onRedo,
  onPaste
}: PdfViewerToolbarProps) {
  return (
    <header className={styles.toolbarRow}>
      <h2 className={styles.viewerTitle}>Viewer</h2>
      <div className={styles.toolbarControls}>
        <PdfSourceControls
          retrievalInputValue={retrievalInputValue}
          retrievalStatus={retrievalStatus}
          canRetryRetrieval={canRetryRetrieval}
          hasPdf={hasPdf}
          manualFileInputRef={manualFileInputRef}
          onRetrievalInputChange={onRetrievalInputChange}
          onRetrieveDocument={onRetrieveDocument}
          onResetWorkspace={onResetWorkspace}
          onRetryRetrieval={onRetryRetrieval}
          onManualFilePick={onManualFilePick}
          onManualFileChange={onManualFileChange}
        />
        <div className={styles.toolbarGroup}>
          <ToolbarIconButton
            label="Previous page"
            icon={<PreviousPageIcon />}
            onClick={() => onMovePage(-1)}
            disabled={!hasPdf}
          />
          <label className={styles.inlineField} htmlFor="viewer-page-input">
            Page
          </label>
          <input
            id="viewer-page-input"
            className={styles.pageInput}
            type="number"
            min={1}
            max={Math.max(1, totalPages)}
            value={currentPage}
            onChange={(event) => onPageInput(Number(event.currentTarget.value))}
            disabled={!hasPdf}
          />
          <span className={styles.metaText}>/ {totalPages || 0}</span>
          <ToolbarIconButton label="Next page" icon={<NextPageIcon />} onClick={() => onMovePage(1)} disabled={!hasPdf} />
        </div>
        <div className={styles.toolbarGroup}>
          <PageViewRotationButton
            disabled={!hasPdf}
            rotationQuarterTurns={currentPageRotationQuarterTurns}
            onRotate={onRotatePageView}
          />
          <span className={styles.metaText}>{currentPageRotationDegrees} deg</span>
        </div>
        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomOut} disabled={!hasPdf}>
            -
          </button>
          <span className={styles.metaText}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={styles.buttonSecondary} onClick={onZoomIn} disabled={!hasPdf}>
            +
          </button>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => {
              void onFitToWidth(currentPageRotationQuarterTurns);
            }}
            disabled={!hasPdf}
          >
            Fit
          </button>
        </div>
        <div className={styles.toolbarGroup}>
          <ToolbarIconButton label="Undo" icon={<UndoIcon />} onClick={onUndo} disabled={!hasPdf || !canUndo} />
          <ToolbarIconButton label="Redo" icon={<RedoIcon />} onClick={onRedo} disabled={!hasPdf || !canRedo} />
        </div>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onPaste}
            disabled={!hasPdf || !canPaste}
            title={canPaste ? "Paste copied bbox on this page" : "Copy a bbox to enable paste"}
          >
            Paste
          </button>
        </div>
      </div>
    </header>
  );
}

export const PdfViewerToolbar = memo(PdfViewerToolbarComponent);
