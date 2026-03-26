export enum PdfExportErrorCode {
  Validation = "validation",
  BrowserSupport = "browser_support",
  EngineInitialization = "engine_initialization",
  CoordinateMapping = "coordinate_mapping",
  RedactionApply = "redaction_apply",
  Save = "save",
  OverlayRendering = "overlay_rendering",
  Unknown = "unknown"
}

interface PdfExportErrorOptions {
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export class PdfExportError extends Error {
  readonly code: PdfExportErrorCode;
  readonly cause?: unknown;
  readonly metadata?: Record<string, unknown>;

  constructor(code: PdfExportErrorCode, message: string, options: PdfExportErrorOptions = {}) {
    super(message);
    this.name = "PdfExportError";
    this.code = code;
    this.cause = options.cause;
    this.metadata = options.metadata;
  }
}

export function normalizePdfExportError(error: unknown): PdfExportError {
  if (error instanceof PdfExportError) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return new PdfExportError(PdfExportErrorCode.Unknown, error.message, { cause: error });
  }

  return new PdfExportError(PdfExportErrorCode.Unknown, "Export failed.");
}
