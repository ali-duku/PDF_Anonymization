/**
 * Rich parse error payload used by the setup tab.
 */
export interface JsonErrorDetails {
  message: string;
  position?: number;
  line?: number;
  column?: number;
}

/**
 * Result from the JSON generator flow.
 */
export interface JsonGenerationResult {
  success: boolean;
  formattedJson: string;
  error?: JsonErrorDetails;
}
