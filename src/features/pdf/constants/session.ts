export const SESSION_STORAGE_KEY = "pdf-anonymization.sessions";
export const SESSION_STORAGE_SCHEMA_VERSION = 1;
export const MAX_PERSISTED_SESSIONS = 25;
export const AUTOSAVE_DEBOUNCE_MS = 400;
export const SAVE_STATUS_HOLD_MS = 1800;
export const RUNTIME_HISTORY_LIMIT = 120;
export const PERSISTED_HISTORY_LIMIT = 40;

export const SESSION_UNLOAD_WARNING_MESSAGE =
  "You have unexported or unsaved anonymization work that may be lost.";

export const SESSION_SWITCH_WARNING_TITLE = "Discard current session changes?";
export const SESSION_SWITCH_WARNING_DESCRIPTION =
  "This PDF has unsaved or unexported bbox work. Continue to switch sources?";
