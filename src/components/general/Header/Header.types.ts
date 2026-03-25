import type { AppMeta } from "../../../types/appMeta";
import type { EntityProfileId } from "../../../types/anonymizationProfiles";
import type { AppTab } from "../TabNav/TabNav.types";
import type { FontSizeOption } from "../../../types/displaySettings";
import type { TextDirection } from "../../../types/textDirection";
import type { EntityProfileOption } from "../EntityProfileControl/EntityProfileControl.types";

export interface HeaderProps {
  appMeta: AppMeta;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onGenerateJson?: () => void;
  onManualSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  fontSize: FontSizeOption;
  onFontSizeChange: (fontSize: FontSizeOption) => void;
  activeEntityProfileId: EntityProfileId;
  entityProfileOptions: readonly EntityProfileOption[];
  onActiveEntityProfileChange: (profileId: EntityProfileId) => void;
  defaultTextDirection: TextDirection;
  onToggleDefaultTextDirection: () => void;
  isBboxStructuralEditingEnabled: boolean;
  onToggleBboxStructuralEditing: () => void;
  canManualSave?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}
