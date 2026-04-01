import type { AppMeta } from "../../../types/appMeta";
import type { SaveStatus } from "../../../features/pdf/types/session";

export interface AppHeaderProps {
  appMeta: AppMeta;
  onOpenWhatsNew: () => void;
  onSaveSession: () => Promise<void>;
  canSaveSession: boolean;
  saveStatus: SaveStatus;
  onExportPdf: () => Promise<void>;
  canExportPdf: boolean;
  isExportingPdf: boolean;
  exportStatusMessage?: string;
}
