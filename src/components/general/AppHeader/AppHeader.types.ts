import type { AppMeta } from "../../../types/appMeta";

export interface AppHeaderProps {
  appMeta: AppMeta;
  onOpenWhatsNew: () => void;
  onExportPdf: () => Promise<void>;
  canExportPdf: boolean;
  isExportingPdf: boolean;
  exportStatusMessage?: string;
}
