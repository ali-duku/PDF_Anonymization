import type { AppLanguageMode } from "../../../../types/language";

export interface BboxLabelEditorProps {
  languageMode: AppLanguageMode;
  entityLabel: string;
  instanceNumber: number | null;
  options: readonly string[];
  onEntityLabelChange: (nextLabel: string) => void;
  onInstanceNumberChange: (nextNumber: number | null) => void;
  onRegisterCustomOption: (label: string) => void;
  onClose: () => void;
}

