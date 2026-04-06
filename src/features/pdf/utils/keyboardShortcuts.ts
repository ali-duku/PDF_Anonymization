export interface KeyboardShortcut {
  code?: string | readonly string[];
  key?: string | readonly string[];
  requirePrimaryModifier?: boolean;
  shift?: boolean;
  alt?: boolean;
}

function toArray(value: string | readonly string[]): readonly string[] {
  if (typeof value === "string") {
    return [value];
  }

  return value;
}

function normalizeKey(value: string): string {
  return value.toLowerCase();
}

function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

function matchesCodes(event: KeyboardEvent, expectedCodes: string | readonly string[]): boolean {
  const normalizedEventCode = event.code;
  if (!normalizedEventCode) {
    return false;
  }

  return toArray(expectedCodes).some((expectedCode) => normalizedEventCode === expectedCode);
}

function matchesKeys(event: KeyboardEvent, expectedKeys: string | readonly string[]): boolean {
  const normalizedEventKey = normalizeKey(event.key);
  return toArray(expectedKeys).some((expectedKey) => normalizedEventKey === normalizeKey(expectedKey));
}

export function matchesKeyboardShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  if (shortcut.requirePrimaryModifier === true && !hasPrimaryModifier(event)) {
    return false;
  }

  if (shortcut.requirePrimaryModifier === false && hasPrimaryModifier(event)) {
    return false;
  }

  if (shortcut.shift !== undefined && event.shiftKey !== shortcut.shift) {
    return false;
  }

  if (shortcut.alt !== undefined && event.altKey !== shortcut.alt) {
    return false;
  }

  const codeMatcher = shortcut.code;
  const keyMatcher = shortcut.key;
  const hasCodeMatcher = codeMatcher !== undefined;
  const hasKeyMatcher = keyMatcher !== undefined;

  if (!hasCodeMatcher && !hasKeyMatcher) {
    return false;
  }

  return (
    (hasCodeMatcher && matchesCodes(event, codeMatcher)) ||
    (hasKeyMatcher && matchesKeys(event, keyMatcher))
  );
}

export function matchesAnyKeyboardShortcut(
  event: KeyboardEvent,
  shortcuts: readonly KeyboardShortcut[]
): boolean {
  return shortcuts.some((shortcut) => matchesKeyboardShortcut(event, shortcut));
}
