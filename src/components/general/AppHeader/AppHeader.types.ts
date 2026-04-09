import type { AppMeta } from "../../../types/appMeta";
import type { AppLanguageMode } from "../../../types/language";
import type { SaveStatus } from "../../../features/pdf/types/session";

export interface AppHeaderProps {
  appMeta: AppMeta;
  languageMode: AppLanguageMode;
  onLanguageModeChange: (mode: AppLanguageMode) => void;
  onOpenWhatsNew: () => void;
  onOpenRestoreSession: () => void;
  onSaveSession: () => Promise<void>;
  canSaveSession: boolean;
  canRestoreSession: boolean;
  saveStatus: SaveStatus;
  onExportPdf: () => Promise<void>;
  canExportPdf: boolean;
  isExportingPdf: boolean;
  exportStatusMessage?: string;
}
