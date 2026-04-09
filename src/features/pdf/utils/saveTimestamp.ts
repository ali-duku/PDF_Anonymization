import type { AppLanguageMode } from "../../../types/language";

function resolveTimeLocale(languageMode: AppLanguageMode): string {
  return languageMode === "en" ? "en-US-u-nu-latn" : "ar-u-nu-arab";
}

export function formatSaveTimestamp(timestamp: number | null, languageMode: AppLanguageMode): string {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(resolveTimeLocale(languageMode), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}
