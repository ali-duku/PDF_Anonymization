import type { AppLanguageMode } from "../../../types/language";
import { normalizeArabicDigitsToLatin } from "./arabicNumerals";
import { normalizePotentialMojibakeText } from "./textEncoding";

const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF]/;
const ARABIC_DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_TATWEEL_REGEX = /\u0640/g;
const WHITESPACE_REGEX = /\s+/g;

const ARABIC_SEARCH_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/[آأإٱ]/g, "ا"],
  [/[ؤ]/g, "و"],
  [/[ئ]/g, "ي"],
  [/[ىی]/g, "ي"],
  [/[ة]/g, "ه"],
  [/[ک]/g, "ك"]
];

function normalizeWhitespace(value: string): string {
  return value.trim().replace(WHITESPACE_REGEX, " ");
}

export function containsArabicScript(value: string): boolean {
  return ARABIC_SCRIPT_REGEX.test(value);
}

export function resolveEntityLabelLanguage(value: string): AppLanguageMode {
  return containsArabicScript(value) ? "ar" : "en";
}

export function normalizeEntityLabelForSearch(rawValue: string): string {
  const safeValue = normalizePotentialMojibakeText(rawValue);
  const normalizedDigits = normalizeArabicDigitsToLatin(safeValue);
  const normalizedWhitespace = normalizeWhitespace(normalizedDigits);
  if (!normalizedWhitespace) {
    return "";
  }

  const lowerCased = normalizedWhitespace.toLocaleLowerCase("en-US");
  const withoutDiacritics = lowerCased
    .replace(ARABIC_DIACRITICS_REGEX, "")
    .replace(ARABIC_TATWEEL_REGEX, "");

  return ARABIC_SEARCH_REPLACEMENTS.reduce(
    (previous, [pattern, replacement]) => previous.replace(pattern, replacement),
    withoutDiacritics
  );
}
