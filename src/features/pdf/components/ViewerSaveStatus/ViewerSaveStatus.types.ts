import type { SaveStatus } from "../../types/session";

export interface ViewerSaveStatusProps {
  hasPdf: boolean;
  saveStatus: SaveStatus;
  lastAutosaveAt: number | null;
}
