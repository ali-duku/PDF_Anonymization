import type { AppLanguageMode, TextDirection } from "../types/language";

export type NumeralSystem = "latin" | "arabicIndic";

export interface LanguageModePresentation {
  direction: TextDirection;
  lang: AppLanguageMode;
  textAlign: "left" | "right";
  numeralSystem: NumeralSystem;
}

export const DEFAULT_APP_LANGUAGE_MODE: AppLanguageMode = "ar";

const LANGUAGE_MODE_STORAGE_KEY = "pdf-anonymization.language-mode";

export function isAppLanguageMode(value: unknown): value is AppLanguageMode {
  return value === "en" || value === "ar";
}

export function resolveLanguageModePresentation(mode: AppLanguageMode): LanguageModePresentation {
  if (mode === "en") {
    return {
      direction: "ltr",
      lang: "en",
      textAlign: "left",
      numeralSystem: "latin"
    };
  }

  return {
    direction: "rtl",
    lang: "ar",
    textAlign: "right",
    numeralSystem: "arabicIndic"
  };
}

export function readPersistedLanguageMode(): AppLanguageMode {
  if (typeof window === "undefined") {
    return DEFAULT_APP_LANGUAGE_MODE;
  }

  try {
    const rawValue = window.localStorage.getItem(LANGUAGE_MODE_STORAGE_KEY);
    if (isAppLanguageMode(rawValue)) {
      return rawValue;
    }
  } catch {
    // Ignore storage failures and keep the default mode.
  }

  return DEFAULT_APP_LANGUAGE_MODE;
}

export function writePersistedLanguageMode(mode: AppLanguageMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures and keep working in memory.
  }
}
