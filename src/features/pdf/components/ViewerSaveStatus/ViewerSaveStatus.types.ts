import type { SaveStatus } from "../../types/session";
import type { AppLanguageMode } from "../../../../types/language";

export interface ViewerSaveStatusProps {
  languageMode: AppLanguageMode;
  hasPdf: boolean;
  saveStatus: SaveStatus;
  lastAutosaveAt: number | null;
}
