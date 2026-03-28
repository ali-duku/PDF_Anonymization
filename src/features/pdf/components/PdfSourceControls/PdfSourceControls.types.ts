import type { PdfRetrievalStatus } from "../../hooks/usePdfRetrieval";

export interface PdfSourceControlsProps {
  retrievalInputValue: string;
  retrievalStatus: PdfRetrievalStatus;
  canRetryRetrieval: boolean;
  onRetrievalInputChange: (value: string) => void;
  onRetrieveDocument: () => void;
  onResetWorkspace: () => void;
  onRetryRetrieval: () => void;
}
