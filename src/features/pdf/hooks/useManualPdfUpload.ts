import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type MutableRefObject
} from "react";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";

export type ManualPdfUploadStatus = "idle" | "success" | "error";

interface UseManualPdfUploadOptions {
  onDocumentLoaded?: (document: RetrievedPdfDocument) => void;
  onDocumentCleared?: () => void;
}

interface ManualPdfUploadState {
  status: ManualPdfUploadStatus;
  errorMessage: string | null;
  document: RetrievedPdfDocument | null;
}

interface ManualPdfUploadActions {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  handleFilePick: () => void;
  handleFileChange: ChangeEventHandler<HTMLInputElement>;
  resetManualUpload: () => void;
}

function isPdfFile(file: File): boolean {
  return file.type.toLowerCase().startsWith("application/pdf") || file.name.toLowerCase().endsWith(".pdf");
}

function buildManualMeta(file: File): RetrievedPdfMeta {
  const now = new Date().toISOString();

  return {
    id: `upload-${Date.now()}`,
    fileName: file.name || "uploaded.pdf",
    bucketKey: `local/${file.name || "uploaded.pdf"}`,
    contentType: file.type || "application/pdf",
    fileSize: file.size,
    updatedAt: now,
    requestUrl: "local://upload",
    retrievedAt: now
  };
}

export function useManualPdfUpload({
  onDocumentLoaded,
  onDocumentCleared
}: UseManualPdfUploadOptions = {}): ManualPdfUploadState & ManualPdfUploadActions {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<ManualPdfUploadState>({
    status: "idle",
    errorMessage: null,
    document: null
  });

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!isPdfFile(file)) {
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage: "Only PDF files are supported."
        }));
        event.currentTarget.value = "";
        return;
      }

      const nextDocument: RetrievedPdfDocument = {
        blob: file,
        meta: buildManualMeta(file)
      };

      setState({
        status: "success",
        errorMessage: null,
        document: nextDocument
      });
      onDocumentLoaded?.(nextDocument);
      event.currentTarget.value = "";
    },
    [onDocumentLoaded]
  );

  const resetManualUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setState({
      status: "idle",
      errorMessage: null,
      document: null
    });
    onDocumentCleared?.();
  }, [onDocumentCleared]);

  return useMemo(
    () => ({
      status: state.status,
      errorMessage: state.errorMessage,
      document: state.document,
      fileInputRef,
      handleFilePick,
      handleFileChange,
      resetManualUpload
    }),
    [handleFileChange, handleFilePick, resetManualUpload, state.document, state.errorMessage, state.status]
  );
}
