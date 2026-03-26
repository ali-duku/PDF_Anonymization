import { memo } from "react";
import { ToolbarIconButton } from "../../../../components/general/ToolbarIconButton/ToolbarIconButton";
import { PdfSourceControls } from "../PdfSourceControls/PdfSourceControls";
import styles from "./PdfDocumentStage.module.css";
import type { PdfDocumentStageProps } from "./PdfDocumentStage.types";

function PdfDocumentStageComponent({
  hasPdf,
  loadStatus,
  statusText,
  statusTone,
  retrievalInputValue,
  retrievalStatus,
  canRetryRetrieval,
  manualFileInputRef,
  currentPage,
  totalPages,
  zoom,
  pageWidth,
  pageHeight,
  pageStageRef,
  canvasContainerRef,
  canvasRef,
  onRetrievalInputChange,
  onRetrieveDocument,
  onResetWorkspace,
  onRetryRetrieval,
  onManualFilePick,
  onManualFileChange,
  onMovePage,
  onPageInput,
  onZoomOut,
  onZoomIn,
  onFitToWidth
}: PdfDocumentStageProps) {
  return (
    <section className={styles.stagePanel} aria-label="PDF viewer stage">
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
              icon={"\u2190"}
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

            <ToolbarIconButton
              label="Next page"
              icon={"\u2192"}
              onClick={() => onMovePage(1)}
              disabled={!hasPdf}
            />
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
                void onFitToWidth();
              }}
              disabled={!hasPdf}
            >
              Fit
            </button>
            <button
              type="button"
              className={styles.buttonSecondary}
              disabled
              title="Add BBox is coming soon."
            >
              Add BBox
            </button>
          </div>
        </div>
      </header>

      <div
        ref={canvasContainerRef}
        className={`${styles.canvasShell} ${hasPdf ? styles.canvasShellActive : ""}`}
        onContextMenu={(event) => {
          if (hasPdf) {
            event.preventDefault();
          }
        }}
      >
        <div
          ref={pageStageRef}
          className={styles.pageStage}
          style={
            pageWidth > 0 && pageHeight > 0
              ? {
                  width: `${pageWidth}px`,
                  height: `${pageHeight}px`
                }
              : undefined
          }
        >
          {hasPdf && <canvas ref={canvasRef} className={styles.pdfCanvas} />}

          {!hasPdf && loadStatus !== "loading" && (
            <div className={styles.emptyView}>
              <h3>No PDF</h3>
              <p>Load a PDF to start.</p>
            </div>
          )}
        </div>
      </div>

      {statusText && (
        <p
          className={`${styles.statusLine} ${
            statusTone === "error"
              ? styles.statusLineError
              : statusTone === "success"
                ? styles.statusLineSuccess
                : ""
          }`}
        >
          {statusText}
        </p>
      )}
    </section>
  );
}

export const PdfDocumentStage = memo(PdfDocumentStageComponent);
