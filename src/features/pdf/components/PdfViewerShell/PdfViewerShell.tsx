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
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        pageBaseWidth={pageBaseWidth}
        pageBaseHeight={pageBaseHeight}
        documentMeta={documentMeta}
        sourcePdfBlob={sourcePdfBlob}
        sourceFileName={sourceFileName}
        pageStageRef={pageStageRef}
        canvasContainerRef={canvasContainerRef}
        canvasRef={canvasRef}
        onExportControllerChange={onExportControllerChange}
        onSessionControllerChange={onSessionControllerChange}
        onRetrievalInputChange={onRetrievalInputChange}
        onRetrieveDocument={onRetrieveDocument}
        onResetWorkspace={onResetWorkspace}
        onRetryRetrieval={onRetryRetrieval}
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
