export interface RestoreSessionPromptProps {
  isOpen: boolean;
  fileName: string;
  bboxCount: number;
  lastSavedAt: number | null;
  onRestore: () => void;
  onSkip: () => void;
}
