import { memo } from "react";
import { PdfDocumentStage } from "../PdfDocumentStage/PdfDocumentStage";
import styles from "./PdfViewerShell.module.css";
import type { PdfViewerShellProps } from "./PdfViewerShell.types";

function PdfViewerShellComponent({
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
}: PdfViewerShellProps) {
  return (
    <section className={styles.viewerShell} aria-label="PDF viewer workspace">
      <PdfDocumentStage
        hasPdf={hasPdf}
        loadStatus={loadStatus}
        statusText={statusText}
        statusTone={statusTone}
        retrievalInputValue={retrievalInputValue}
        retrievalStatus={retrievalStatus}
        canRetryRetrieval={canRetryRetrieval}
        manualFileInputRef={manualFileInputRef}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        pageStageRef={pageStageRef}
        canvasContainerRef={canvasContainerRef}
        canvasRef={canvasRef}
        onRetrievalInputChange={onRetrievalInputChange}
        onRetrieveDocument={onRetrieveDocument}
        onResetWorkspace={onResetWorkspace}
        onRetryRetrieval={onRetryRetrieval}
        onManualFilePick={onManualFilePick}
        onManualFileChange={onManualFileChange}
        onMovePage={onMovePage}
        onPageInput={onPageInput}
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        onFitToWidth={onFitToWidth}
      />
    </section>
  );
}

export const PdfViewerShell = memo(PdfViewerShellComponent);
