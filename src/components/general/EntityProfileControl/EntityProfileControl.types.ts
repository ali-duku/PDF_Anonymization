import type { EntityProfileId } from "../../../types/anonymizationProfiles";

export interface EntityProfileOption {
  id: EntityProfileId;
  displayName: string;
}

export interface EntityProfileControlProps {
  value: EntityProfileId;
  options: readonly EntityProfileOption[];
  onChange: (profileId: EntityProfileId) => void;
}
