import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { PdfLoadStatus } from "../../../../types/pdf";
import { SESSION_SWITCH_WARNING_DESCRIPTION, SESSION_SWITCH_WARNING_TITLE } from "../../constants/session";
import { useBeforeUnloadProtection } from "../../hooks/useBeforeUnloadProtection";
import { usePdfDocument } from "../../hooks/usePdfDocument";
import { usePdfRetrieval } from "../../hooks/usePdfRetrieval";
import type { PdfSessionController } from "../../types/session";
import { PdfViewerShell } from "../PdfViewerShell/PdfViewerShell";
import { SessionRiskPrompt } from "../SessionRiskPrompt/SessionRiskPrompt";
import styles from "./PdfWorkspace.module.css";
import type { PdfWorkspaceProps } from "./PdfWorkspace.types";

type ActiveSource = "none" | "retrieval";

interface PendingRiskAction {
  confirmLabel: string;
  execute: () => void;
}

const DEFAULT_SESSION_CONTROLLER: PdfSessionController = {
  canSave: false,
  saveStatus: "idle",
  lastAutosaveAt: null,
  lastManualSaveAt: null,
  canUndo: false,
  canRedo: false,
  hasLossRisk: false,
  manualSave: async () => {
    // No-op until a PDF session is active.
  }
};

function buildDocumentLoadStatus(loadStatus: PdfLoadStatus, errorMessage?: string) {
  if (loadStatus === "loading") {
    return { text: "Loading PDF...", tone: "neutral" as const };
  }

  if (loadStatus === "error") {
    return { text: errorMessage ?? "PDF loading failed.", tone: "error" as const };
  }

  return { text: "", tone: "neutral" as const };
}

function PdfWorkspaceComponent({
  pdfRetrievalService,
  onExportControllerChange,
  onSessionControllerChange
}: PdfWorkspaceProps) {
  const [activeSource, setActiveSource] = useState<ActiveSource>("none");
  const [retrievalInputValue, setRetrievalInputValue] = useState("");
  const [sessionController, setSessionController] =
    useState<PdfSessionController>(DEFAULT_SESSION_CONTROLLER);
  const [pendingRiskAction, setPendingRiskAction] = useState<PendingRiskAction | null>(null);

  useBeforeUnloadProtection(sessionController.hasLossRisk);

  useEffect(() => {
    onSessionControllerChange?.(sessionController);
  }, [onSessionControllerChange, sessionController]);

  const runWithSessionRiskGuard = useCallback(
    (action: () => void, confirmLabel: string) => {
      if (!sessionController.hasLossRisk) {
        action();
        return;
      }

      setPendingRiskAction({
        confirmLabel,
        execute: action
      });
    },
    [sessionController.hasLossRisk]
  );

  const { state: retrievalState, requestDocument, retryLastRequest, resetRetrieval } = usePdfRetrieval({
    pdfRetrievalService,
    onDocumentRetrieved: () => {
      setActiveSource("retrieval");
    },
    onDocumentCleared: () => {
      setActiveSource((previous) => (previous === "retrieval" ? "none" : previous));
    }
  });

  const activeDocument = useMemo(() => {
    if (activeSource === "retrieval") {
      return retrievalState.document;
    }
    return null;
  }, [activeSource, retrievalState.document]);

  const pdfState = usePdfDocument({ retrievedPdfDocument: activeDocument });

  const sourceStatus = useMemo(() => {
    if (retrievalState.status === "error") {
      return {
        text: retrievalState.error?.message ?? "Request failed.",
        tone: "error" as const
      };
    }

    if (retrievalState.status === "success" && activeSource === "retrieval" && retrievalState.document) {
      return {
        text: `Loaded ID ${retrievalState.document.meta.id}`,
        tone: "success" as const
      };
    }

    return {
      text: "",
      tone: "neutral" as const
    };
  }, [activeSource, retrievalState.document, retrievalState.error?.message, retrievalState.status]);

  const loadStatus = useMemo(
    () => buildDocumentLoadStatus(pdfState.loadStatus, pdfState.errorMessage),
    [pdfState.errorMessage, pdfState.loadStatus]
  );

  const statusText = loadStatus.text || sourceStatus.text;
  const statusTone = loadStatus.text ? loadStatus.tone : sourceStatus.tone;

  const handleRetrieveDocument = useCallback(() => {
    runWithSessionRiskGuard(() => {
      void requestDocument(retrievalInputValue);
    }, "Continue");
  }, [requestDocument, retrievalInputValue, runWithSessionRiskGuard]);

  const handleResetWorkspace = useCallback(() => {
    runWithSessionRiskGuard(() => {
      setRetrievalInputValue("");
      resetRetrieval();
      setActiveSource("none");
    }, "Reset");
  }, [resetRetrieval, runWithSessionRiskGuard]);

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
        currentPage={pdfState.currentPage}
        totalPages={pdfState.totalPages}
        zoom={pdfState.zoom}
        pageWidth={pdfState.pageWidth}
        pageHeight={pdfState.pageHeight}
        pageBaseWidth={pdfState.pageBaseWidth}
        pageBaseHeight={pdfState.pageBaseHeight}
        documentMeta={pdfState.documentMeta}
        sourcePdfBlob={activeDocument?.blob ?? null}
        sourceFileName={activeDocument?.meta.fileName ?? null}
        pageStageRef={pdfState.pageStageRef}
        canvasContainerRef={pdfState.canvasContainerRef}
        canvasRef={pdfState.canvasRef}
        onExportControllerChange={onExportControllerChange}
        onSessionControllerChange={setSessionController}
        onRetrievalInputChange={setRetrievalInputValue}
        onRetrieveDocument={handleRetrieveDocument}
        onResetWorkspace={handleResetWorkspace}
        onRetryRetrieval={retryLastRequest}
        onMovePage={pdfState.movePage}
        onPageInput={pdfState.handlePageInput}
        onZoomOut={pdfState.handleZoomOut}
        onZoomIn={pdfState.handleZoomIn}
        onFitToWidth={pdfState.handleFitToWidth}
      />

      <SessionRiskPrompt
        isOpen={pendingRiskAction !== null}
        title={SESSION_SWITCH_WARNING_TITLE}
        description={SESSION_SWITCH_WARNING_DESCRIPTION}
        confirmLabel={pendingRiskAction?.confirmLabel}
        onCancel={() => {
          setPendingRiskAction(null);
        }}
        onConfirm={() => {
          const action = pendingRiskAction;
          setPendingRiskAction(null);
          action?.execute();
        }}
      />
    </section>
  );
}

export const PdfWorkspace = memo(PdfWorkspaceComponent);
