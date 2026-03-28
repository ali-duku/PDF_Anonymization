import {
  EXPORT_FALLBACK_FILE_NAME,
  EXPORT_FILE_EXTENSION,
  EXPORT_FILE_SUFFIX
} from "../constants/export";

function sanitizeFileStem(stem: string): string {
  const sanitized = stem
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-");

  return sanitized || "document";
}

export function buildAnonymizedFileName(sourceFileName?: string | null): string {
  if (!sourceFileName) {
    return EXPORT_FALLBACK_FILE_NAME;
  }

  const trimmedFileName = sourceFileName.trim();
  if (!trimmedFileName) {
    return EXPORT_FALLBACK_FILE_NAME;
  }

  const extensionPattern = new RegExp(`${EXPORT_FILE_EXTENSION}$`, "i");
  const withoutExtension = trimmedFileName.replace(extensionPattern, "");
  const safeStem = sanitizeFileStem(withoutExtension);
  return `${safeStem}${EXPORT_FILE_SUFFIX}${EXPORT_FILE_EXTENSION}`;
}
