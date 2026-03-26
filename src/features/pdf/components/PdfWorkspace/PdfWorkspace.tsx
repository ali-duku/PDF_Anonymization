import { memo, useCallback, useMemo, useState } from "react";
import type { PdfLoadStatus } from "../../../../types/pdf";
import { useManualPdfUpload } from "../../hooks/useManualPdfUpload";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { usePdfRetrieval } from "../../hooks/usePdfRetrieval";
import { PdfViewerShell } from "../PdfViewerShell/PdfViewerShell";
import styles from "./PdfWorkspace.module.css";
import type { PdfWorkspaceProps } from "./PdfWorkspace.types";

type ActiveSource = "none" | "retrieval" | "upload";

function buildDocumentLoadStatus(loadStatus: PdfLoadStatus, errorMessage?: string) {
  if (loadStatus === "loading") {
    return { text: "Loading PDF...", tone: "neutral" as const };
  }

  if (loadStatus === "error") {
    return { text: errorMessage ?? "PDF loading failed.", tone: "error" as const };
  }

  return { text: "", tone: "neutral" as const };
}

function PdfWorkspaceComponent({ pdfRetrievalService }: PdfWorkspaceProps) {
  const [activeSource, setActiveSource] = useState<ActiveSource>("none");
  const [retrievalInputValue, setRetrievalInputValue] = useState("");

  const { state: retrievalState, requestDocument, retryLastRequest, resetRetrieval } = usePdfRetrieval({
    pdfRetrievalService,
    onDocumentRetrieved: () => {
      setActiveSource("retrieval");
    },
    onDocumentCleared: () => {
      setActiveSource((previous) => (previous === "retrieval" ? "none" : previous));
    }
  });

  const {
    status: uploadStatus,
    errorMessage: uploadErrorMessage,
    document: uploadedDocument,
    fileInputRef,
    handleFilePick,
    handleFileChange,
    resetManualUpload
  } = useManualPdfUpload({
    onDocumentLoaded: () => {
      setActiveSource("upload");
    },
    onDocumentCleared: () => {
      setActiveSource((previous) => (previous === "upload" ? "none" : previous));
    }
  });

  const activeDocument = useMemo(() => {
    if (activeSource === "upload") {
      return uploadedDocument;
    }
    if (activeSource === "retrieval") {
      return retrievalState.document;
    }
    return null;
  }, [activeSource, retrievalState.document, uploadedDocument]);

  const pdfState = usePdfDocument({ retrievedPdfDocument: activeDocument });

  const sourceStatus = useMemo(() => {
    if (retrievalState.status === "error") {
      return {
        text: retrievalState.error?.message ?? "Request failed.",
        tone: "error" as const
      };
    }

    if (uploadStatus === "error") {
      return {
        text: uploadErrorMessage ?? "Upload failed.",
        tone: "error" as const
      };
    }

    if (retrievalState.status === "success" && activeSource === "retrieval" && retrievalState.document) {
      return {
        text: `Loaded ID ${retrievalState.document.meta.id}`,
        tone: "success" as const
      };
    }

    if (uploadStatus === "success" && activeSource === "upload" && uploadedDocument) {
      return {
        text: `Loaded ${uploadedDocument.meta.fileName}`,
        tone: "success" as const
      };
    }

    return {
      text: "",
      tone: "neutral" as const
    };
  }, [
    activeSource,
    retrievalState.document,
    retrievalState.error?.message,
    retrievalState.status,
    uploadErrorMessage,
    uploadStatus,
    uploadedDocument
  ]);

  const loadStatus = useMemo(
    () => buildDocumentLoadStatus(pdfState.loadStatus, pdfState.errorMessage),
    [pdfState.errorMessage, pdfState.loadStatus]
  );

  const statusText = loadStatus.text || sourceStatus.text;
  const statusTone = loadStatus.text ? loadStatus.tone : sourceStatus.tone;

  const handleRetrieveDocument = useCallback(() => {
    void requestDocument(retrievalInputValue);
  }, [requestDocument, retrievalInputValue]);

  const handleResetWorkspace = useCallback(() => {
    setRetrievalInputValue("");
    resetRetrieval();
    resetManualUpload();
    setActiveSource("none");
  }, [resetManualUpload, resetRetrieval]);

  return (
    <section className={styles.workspace} aria-label="PDF anonymization workspace">
      <PdfViewerShell
        hasPdf={pdfState.hasPdf}
        loadStatus={pdfState.loadStatus}
        statusText={statusText}
        statusTone={statusTone}
        retrievalInputValue={retrievalInputValue}
        retrievalStatus={retrievalState.status}
        canRetryRetrieval={Boolean(retrievalState.lastRequestedId) && retrievalState.status !== "loading"}
        manualFileInputRef={fileInputRef}
        currentPage={pdfState.currentPage}
        totalPages={pdfState.totalPages}
        zoom={pdfState.zoom}
        pageWidth={pdfState.pageWidth}
        pageHeight={pdfState.pageHeight}
        pageStageRef={pdfState.pageStageRef}
        canvasContainerRef={pdfState.canvasContainerRef}
        canvasRef={pdfState.canvasRef}
        onRetrievalInputChange={setRetrievalInputValue}
        onRetrieveDocument={handleRetrieveDocument}
        onResetWorkspace={handleResetWorkspace}
        onRetryRetrieval={retryLastRequest}
        onManualFilePick={handleFilePick}
        onManualFileChange={handleFileChange}
        onMovePage={pdfState.movePage}
        onPageInput={pdfState.handlePageInput}
        onZoomOut={pdfState.handleZoomOut}
        onZoomIn={pdfState.handleZoomIn}
        onFitToWidth={pdfState.handleFitToWidth}
      />
    </section>
  );
}

export const PdfWorkspace = memo(PdfWorkspaceComponent);
