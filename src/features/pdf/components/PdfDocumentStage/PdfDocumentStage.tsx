import { memo, useEffect, useMemo } from "react";
import { ToolbarIconButton } from "../../../../components/general/ToolbarIconButton/ToolbarIconButton";
import { usePdfBboxes } from "../../hooks/usePdfBboxes";
import { usePdfExport } from "../../hooks/usePdfExport";
import { BboxOverlayLayer } from "../BboxOverlayLayer/BboxOverlayLayer";
import { PdfSourceControls } from "../PdfSourceControls/PdfSourceControls";
import { RestoreSessionPrompt } from "../RestoreSessionPrompt/RestoreSessionPrompt";
import { ViewerSaveStatus } from "../ViewerSaveStatus/ViewerSaveStatus";
import styles from "./PdfDocumentStage.module.css";
import type { PdfDocumentStageProps } from "./PdfDocumentStage.types";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

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
  pageBaseWidth,
  pageBaseHeight,
  documentMeta,
  sourcePdfBlob,
  sourceFileName,
  pageStageRef,
  canvasContainerRef,
  canvasRef,
  onExportControllerChange,
  onSessionControllerChange,
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
  const pageSize = useMemo(
    () => ({
      width: pageBaseWidth,
      height: pageBaseHeight
    }),
    [pageBaseHeight, pageBaseWidth]
  );

  const displayPageSize = useMemo(
    () => ({
      width: pageWidth,
      height: pageHeight
    }),
    [pageHeight, pageWidth]
  );

  const bboxState = usePdfBboxes({
    documentMeta,
    currentPage,
    pageSize
  });

  const exportState = usePdfExport({
    sourcePdfBlob,
    sourceFileName,
    bboxes: bboxState.bboxes,
    onExportSuccess: bboxState.markExported
  });

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!hasPdf || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasControlModifier = event.metaKey || event.ctrlKey;
      if (!hasControlModifier) {
        return;
      }

      const shouldUndo = key === "z" && !event.shiftKey;
      const shouldRedo = key === "y" || (key === "z" && event.shiftKey);

      if (shouldUndo && bboxState.canUndo) {
        event.preventDefault();
        bboxState.undo();
      }

      if (shouldRedo && bboxState.canRedo) {
        event.preventDefault();
        bboxState.redo();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [bboxState, hasPdf]);

  const exportController = useMemo(
    () => ({
      canExport: exportState.canExport && hasPdf,
      isExporting: exportState.isExporting,
      statusMessage: exportState.statusMessage,
      statusTone: exportState.statusTone,
      exportPdf: exportState.exportPdf
    }),
    [
      exportState.canExport,
      exportState.exportPdf,
      exportState.isExporting,
      exportState.statusMessage,
      exportState.statusTone,
      hasPdf
    ]
  );

  const sessionController = useMemo(
    () => ({
      canSave: bboxState.canSave && hasPdf,
      saveStatus: bboxState.saveStatus,
      lastAutosaveAt: bboxState.lastAutosaveAt,
      lastManualSaveAt: bboxState.lastManualSaveAt,
      canUndo: bboxState.canUndo,
      canRedo: bboxState.canRedo,
      hasLossRisk: bboxState.hasLossRisk,
      manualSave: bboxState.manualSave
    }),
    [bboxState, hasPdf]
  );

  useEffect(() => {
    onExportControllerChange?.(exportController);
  }, [exportController, onExportControllerChange]);

  useEffect(() => {
    onSessionControllerChange?.(sessionController);
  }, [onSessionControllerChange, sessionController]);

  const showFooterRow = Boolean(statusText) || hasPdf;

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
          </div>

          <div className={styles.toolbarGroup}>
            <ToolbarIconButton
              label="Undo"
              icon={"\u21b6"}
              onClick={bboxState.undo}
              disabled={!hasPdf || !bboxState.canUndo}
            />
            <ToolbarIconButton
              label="Redo"
              icon={"\u21b7"}
              onClick={bboxState.redo}
              disabled={!hasPdf || !bboxState.canRedo}
            />
          </div>

          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={bboxState.pasteClipboardToCurrentPage}
              disabled={!hasPdf || !bboxState.canPaste}
              title={bboxState.canPaste ? "Paste copied bbox on this page" : "Copy a bbox to enable paste"}
            >
              Paste
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

          {hasPdf && (
            <BboxOverlayLayer
              hasPdf={hasPdf}
              pageStageRef={pageStageRef}
              displayPageSize={displayPageSize}
              pageSize={pageSize}
              bboxes={bboxState.currentPageBboxes}
              selectedBboxId={bboxState.selectedBboxId}
              editingBboxId={bboxState.editingBboxId}
              entityOptions={bboxState.entityOptions}
              onSelectBbox={bboxState.selectBbox}
              onStartEditingBbox={bboxState.startEditingBbox}
              onDeleteBbox={bboxState.deleteBbox}
              onDuplicateBbox={bboxState.duplicateBbox}
              onCopyBbox={bboxState.copyBbox}
              onCreateBbox={bboxState.createBbox}
              onUpdateBboxRect={bboxState.updateBboxRect}
              onUpdateBboxEntityLabel={bboxState.updateBboxEntityLabel}
              onUpdateBboxInstanceNumber={bboxState.updateBboxInstanceNumber}
              onRegisterCustomEntityLabel={bboxState.registerCustomEntityLabel}
            />
          )}

          {!hasPdf && loadStatus !== "loading" && (
            <div className={styles.emptyView}>
              <h3>No PDF</h3>
              <p>Load a PDF to start.</p>
            </div>
          )}
        </div>

        <RestoreSessionPrompt
          isOpen={bboxState.restorePromptState.isOpen}
          fileName={bboxState.restorePromptState.fileName}
          bboxCount={bboxState.restorePromptState.bboxCount}
          lastSavedAt={bboxState.restorePromptState.lastSavedAt}
          onRestore={bboxState.restoreSession}
          onSkip={bboxState.skipRestoreSession}
        />
      </div>

      {showFooterRow && (
        <footer className={styles.footerRow} aria-label="Viewer status">
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
          <ViewerSaveStatus
            hasPdf={hasPdf}
            saveStatus={bboxState.saveStatus}
            lastAutosaveAt={bboxState.lastAutosaveAt}
          />
        </footer>
      )}
    </section>
  );
}

export const PdfDocumentStage = memo(PdfDocumentStageComponent);
