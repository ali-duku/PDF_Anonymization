import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type MutableRefObject
} from "react";
import type { RetrievedPdfDocument, RetrievedPdfMeta } from "../../../types/pdfRetrieval";
import { buildUploadSessionIdentitySeed } from "../utils/pdfSessionIdentity";
import { buildUploadPdfFingerprint } from "../utils/uploadFingerprint";

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

function buildFallbackFingerprint(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

async function buildManualMeta(file: File): Promise<RetrievedPdfMeta> {
  const updatedAt = new Date(file.lastModified || Date.now()).toISOString();
  const fingerprint = await buildUploadPdfFingerprint(file).catch(() => buildFallbackFingerprint(file));
  const identitySeed = buildUploadSessionIdentitySeed({
    fileName: file.name || "uploaded.pdf",
    fileSize: file.size,
    updatedAt,
    uploadFingerprint: fingerprint
  });

  return {
    id: `upload-${fingerprint.slice(0, 12)}`,
    fileName: file.name || "uploaded.pdf",
    bucketKey: `local/${file.name || "uploaded.pdf"}`,
    contentType: file.type || "application/pdf",
    fileSize: file.size,
    updatedAt,
    requestUrl: "local://upload",
    retrievedAt: new Date().toISOString(),
    sourceType: "upload",
    sessionIdentitySeed: identitySeed,
    uploadFingerprint: fingerprint
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

      const inputElement = event.currentTarget;

      if (!isPdfFile(file)) {
        setState((previous) => ({
          ...previous,
          status: "error",
          errorMessage: "Only PDF files are supported."
        }));
        inputElement.value = "";
        return;
      }

      void (async () => {
        const nextDocument: RetrievedPdfDocument = {
          blob: file,
          meta: await buildManualMeta(file)
        };

        setState({
          status: "success",
          errorMessage: null,
          document: nextDocument
        });
        onDocumentLoaded?.(nextDocument);
        inputElement.value = "";
      })();
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
