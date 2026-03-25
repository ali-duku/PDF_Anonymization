import { memo } from "react";
import type { EntityProfileId } from "../../../types/anonymizationProfiles";
import styles from "./EntityProfileControl.module.css";
import type { EntityProfileControlProps } from "./EntityProfileControl.types";

function EntityProfileControlComponent({ value, options, onChange }: EntityProfileControlProps) {
  return (
    <div className={styles.entityProfileControl}>
      <label className={styles.label} htmlFor="global-entity-profile-select">
        Entity profile
      </label>
      <select
        id="global-entity-profile-select"
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as EntityProfileId)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

export const EntityProfileControl = memo(EntityProfileControlComponent);
