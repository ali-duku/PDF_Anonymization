import type { ChangeEventHandler, RefObject } from "react";
import type { PdfRetrievalStatus } from "../../hooks/usePdfRetrieval";

export interface PdfSourceControlsProps {
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  canRetryRetrieval: boolean;
  hasPdf: boolean;
  manualFileInputRef: RefObject<HTMLInputElement>;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetWorkspace: () => void;
  onRetryRetrieval: () => void;
  onManualFilePick: () => void;
  onManualFileChange: ChangeEventHandler<HTMLInputElement>;
}
