import type { AppLanguageMode } from "../../../../types/language";

export interface RestoreSessionPromptProps {
  languageMode: AppLanguageMode;
  isOpen: boolean;
  fileName: string;
  bboxCount: number;
  lastSavedAt: number | null;
  onRestore: () => void;
  onSkip: () => void;
}
