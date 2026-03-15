/**
 * A single release entry used by the What's New UI.
 */
export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

/**
 * Top-level metadata rendered by the app shell.
 */
export interface AppMeta {
  name: string;
  version: string;
  releaseNotes: ReleaseNote[];
}
