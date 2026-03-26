const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"] as const;
const EASTERN_ARABIC_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function formatArabicIndicDigits(value: number | string): string {
  const text = typeof value === "number" ? String(value) : value;
  return text.replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] ?? digit);
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

export function parsePositiveIntegerFromArabicInput(rawValue: string): number | null {
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

