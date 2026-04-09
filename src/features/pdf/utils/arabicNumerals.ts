import type { NumeralSystem } from "../../../utils/languageMode";

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
const EASTERN_ARABIC_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function formatArabicIndicDigits(value: number | string): string {
  const text = typeof value === "number" ? String(value) : value;
  return text.replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit);
}

export function formatDigitsForNumeralSystem(value: number | string, numeralSystem: NumeralSystem): string {
  const normalizedLatinValue = normalizeArabicDigitsToLatin(typeof value === "number" ? String(value) : value);
  if (numeralSystem === "latin") {
    return normalizedLatinValue;
  }

  return formatArabicIndicDigits(normalizedLatinValue);
}

export function normalizeArabicDigitsToLatin(value: string): string {
  let result = value;

  ARABIC_INDIC_DIGITS.forEach((digit, index) => {
    result = result.split(digit).join(String(index));
  });

  EASTERN_ARABIC_DIGITS.forEach((digit, index) => {
    result = result.split(digit).join(String(index));
  });

  return result;
}

export function normalizeLocalizedDigitsToLatin(value: string): string {
  return normalizeArabicDigitsToLatin(value);
}

export function parsePositiveIntegerFromLocalizedInput(rawValue: string): number | null {
  const normalizedDigits = normalizeArabicDigitsToLatin(rawValue).replace(/[^\d]/g, "");
  if (!normalizedDigits) {
    return null;
  }

  const parsed = Number.parseInt(normalizedDigits, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function parsePositiveIntegerFromArabicInput(rawValue: string): number | null {
  return parsePositiveIntegerFromLocalizedInput(rawValue);
}
