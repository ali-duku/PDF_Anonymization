import { memo, useEffect, useMemo, type CSSProperties } from "react";
import { usePdfBboxes } from "../../hooks/usePdfBboxes";
import { usePdfExport } from "../../hooks/usePdfExport";
import { usePdfSessionKeyboardShortcuts } from "../../hooks/usePdfSessionKeyboardShortcuts";
import { BboxOverlayLayer } from "../BboxOverlayLayer/BboxOverlayLayer";
import { PdfViewerToolbar } from "../PdfViewerToolbar/PdfViewerToolbar";
import { RestoreSessionPrompt } from "../RestoreSessionPrompt/RestoreSessionPrompt";
import { ViewerSaveStatus } from "../ViewerSaveStatus/ViewerSaveStatus";
import {
  getPageCanvasRotationTransform,
  getRotatedPageViewSize,
  pageViewQuarterTurnsToDegrees
} from "../../utils/pageViewTransform";
import styles from "./PdfDocumentStage.module.css";
import type { PdfDocumentStageProps } from "./PdfDocumentStage.types";
function PdfDocumentStageComponent({
  languageMode,
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
  const displayPageBaseSize = useMemo(
    () => ({
      width: pageWidth,
      height: pageHeight
    }),
    [pageHeight, pageWidth]
  );
  const bboxState = usePdfBboxes({
    documentMeta,
    currentPage,
    pageSize,
    languageMode
  });
  const currentPageRotationQuarterTurns = bboxState.currentPageViewRotationQuarterTurns;
  const displayPageSize = useMemo(
    () => getRotatedPageViewSize(displayPageBaseSize, currentPageRotationQuarterTurns),
    [currentPageRotationQuarterTurns, displayPageBaseSize]
  );
  const currentPageRotationDegrees = useMemo(
    () => pageViewQuarterTurnsToDegrees(currentPageRotationQuarterTurns),
    [currentPageRotationQuarterTurns]
  );
  const pageCanvasStyle = useMemo<CSSProperties | undefined>(() => {
    if (!hasPdf || pageWidth <= 0 || pageHeight <= 0) {
      return undefined;
    }
    return {
      transform: getPageCanvasRotationTransform(displayPageBaseSize, currentPageRotationQuarterTurns)
    };
  }, [currentPageRotationQuarterTurns, displayPageBaseSize, hasPdf, pageHeight, pageWidth]);
  const exportState = usePdfExport({
    sourcePdfBlob,
    sourceFileName,
    bboxes: bboxState.bboxes,
    revision: bboxState.revision,
    languageMode,
    onExportStart: bboxState.captureExportCheckpoint,
    onExportSuccess: bboxState.markExported
  });
  usePdfSessionKeyboardShortcuts({
    isEnabled: hasPdf,
    canUndo: bboxState.canUndo,
    canRedo: bboxState.canRedo,
    onUndo: bboxState.undo,
    onRedo: bboxState.redo
  });
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
      canRestore: bboxState.canRestoreSession && hasPdf,
      saveStatus: bboxState.saveStatus,
      lastAutosaveAt: bboxState.lastAutosaveAt,
      lastManualSaveAt: bboxState.lastManualSaveAt,
      canUndo: bboxState.canUndo,
      canRedo: bboxState.canRedo,
      hasLossRisk: bboxState.hasLossRisk,
      manualSave: bboxState.manualSave,
      openRestorePrompt: bboxState.openRestoreSessionPrompt
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
      <PdfViewerToolbar
        hasPdf={hasPdf}
        retrievalInputValue={retrievalInputValue}
        retrievalStatus={retrievalStatus}
        canRetryRetrieval={canRetryRetrieval}
        manualFileInputRef={manualFileInputRef}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        currentPageRotationQuarterTurns={currentPageRotationQuarterTurns}
        currentPageRotationDegrees={currentPageRotationDegrees}
        canUndo={bboxState.canUndo}
        canRedo={bboxState.canRedo}
        canPaste={bboxState.canPaste}
        onRetrievalInputChange={onRetrievalInputChange}
        onRetrieveDocument={onRetrieveDocument}
        onResetWorkspace={onResetWorkspace}
        onRetryRetrieval={onRetryRetrieval}
        onManualFilePick={onManualFilePick}
        onManualFileChange={onManualFileChange}
        onMovePage={onMovePage}
        onPageInput={onPageInput}
        onRotatePageView={bboxState.rotateCurrentPageViewClockwise}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onFitToWidth={onFitToWidth}
        onUndo={bboxState.undo}
        onRedo={bboxState.redo}
        onPaste={bboxState.pasteClipboardToCurrentPage}
      />
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
            displayPageSize.width > 0 && displayPageSize.height > 0
              ? {
                  width: `${displayPageSize.width}px`,
                  height: `${displayPageSize.height}px`
                }
              : undefined
          }
        >
          {hasPdf && <canvas ref={canvasRef} className={styles.pdfCanvas} style={pageCanvasStyle} />}
          {hasPdf && (
            <BboxOverlayLayer
              languageMode={languageMode}
              hasPdf={hasPdf}
              pageStageRef={pageStageRef}
              displayPageSize={displayPageSize}
              displayPageBaseSize={displayPageBaseSize}
              pageSize={pageSize}
              pageViewRotationQuarterTurns={currentPageRotationQuarterTurns}
              bboxes={bboxState.currentPageBboxes}
              selectedBboxId={bboxState.selectedBboxId}
              editingBboxId={bboxState.editingBboxId}
              entityOptions={bboxState.entityOptions}
              onSelectBbox={bboxState.selectBbox}
              onStartEditingBbox={bboxState.startEditingBbox}
              onDeleteBbox={bboxState.deleteBbox}
              onDuplicateBbox={bboxState.duplicateBbox}
              onCopyBbox={bboxState.copyBbox}
              onPasteBbox={bboxState.pasteClipboardToCurrentPage}
              canPasteBbox={bboxState.canPaste}
              onCreateBbox={bboxState.createBbox}
              onUpdateBboxRect={bboxState.updateBboxRect}
              onUpdateBboxEntityLabel={bboxState.updateBboxEntityLabel}
              onUpdateBboxInstanceNumber={bboxState.updateBboxInstanceNumber}
              onUpdateBboxTextRotation={bboxState.updateBboxTextRotation}
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
          languageMode={languageMode}
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
            languageMode={languageMode}
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
