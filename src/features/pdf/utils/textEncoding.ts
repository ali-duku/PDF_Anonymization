const MOJIBAKE_MARKER_REGEX = /[\u00C3\u00C2\u00D8\u00D9]/;
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const FALLBACK_CHAR_CODE_LIMIT = 0xff;

function canDecodeMojibake(value: string): boolean {
  return value.length > 0 && MOJIBAKE_MARKER_REGEX.test(value) && !ARABIC_CHAR_REGEX.test(value);
}

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(
    Array.from(value).map((character) => character.charCodeAt(0) & FALLBACK_CHAR_CODE_LIMIT)
  );

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function normalizePotentialMojibakeText(value: string): string {
  if (!canDecodeMojibake(value)) {
    return value;
  }

  const decodedValue = decodeLatin1AsUtf8(value);
  if (!decodedValue || decodedValue === value) {
    return value;
  }

  return ARABIC_CHAR_REGEX.test(decodedValue) ? decodedValue : value;
}
