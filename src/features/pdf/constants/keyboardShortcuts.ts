import type { KeyboardShortcut } from "../utils/keyboardShortcuts";

const PRIMARY_SHORTCUT_NO_SHIFT_BASE: Pick<
  KeyboardShortcut,
  "requirePrimaryModifier" | "shift" | "alt"
> = {
  requirePrimaryModifier: true,
  shift: false,
  alt: false
};

export const PDF_BBOX_OVERLAY_SHORTCUTS: {
  copy: KeyboardShortcut;
  paste: KeyboardShortcut;
  duplicate: KeyboardShortcut;
  dismiss: KeyboardShortcut;
  delete: readonly KeyboardShortcut[];
  startEditing: KeyboardShortcut;
} = {
  copy: {
    ...PRIMARY_SHORTCUT_NO_SHIFT_BASE,
    code: "KeyC"
  },
  paste: {
    ...PRIMARY_SHORTCUT_NO_SHIFT_BASE,
    code: "KeyV"
  },
  duplicate: {
    ...PRIMARY_SHORTCUT_NO_SHIFT_BASE,
    code: "KeyD"
  },
  dismiss: {
    key: "Escape"
  },
  delete: [
    {
      key: "Delete"
    },
    {
      key: "Backspace"
    }
  ],
  startEditing: {
    key: "Enter"
  }
};

export const PDF_SESSION_SHORTCUTS: {
  undo: KeyboardShortcut;
  redo: readonly KeyboardShortcut[];
} = {
  undo: {
    ...PRIMARY_SHORTCUT_NO_SHIFT_BASE,
    code: "KeyZ"
  },
  redo: [
    {
      ...PRIMARY_SHORTCUT_NO_SHIFT_BASE,
      code: "KeyY"
    },
    {
      requirePrimaryModifier: true,
      shift: true,
      alt: false,
      code: "KeyZ"
    }
  ]
};
