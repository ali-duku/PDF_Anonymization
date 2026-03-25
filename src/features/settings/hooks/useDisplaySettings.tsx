import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  DISPLAY_SETTINGS_STORAGE_KEY,
  FONT_SIZE_SCALE_BY_OPTION
} from "../constants/displaySettings";
import type { EntityProfileId } from "../../../types/anonymizationProfiles";
import type { TextDirection } from "../../../types/textDirection";
import { FONT_SIZE_OPTIONS, type DisplaySettings, type FontSizeOption } from "../../../types/displaySettings";
import { ENTITY_PROFILES } from "../../../constants/anonymizationEntities";

interface DisplaySettingsContextValue {
  settings: DisplaySettings;
  setFontSize: (fontSize: FontSizeOption) => void;
  setActiveEntityProfileId: (profileId: EntityProfileId) => void;
  setDefaultTextDirection: (direction: TextDirection) => void;
  setIsBboxStructuralEditingEnabled: (isEnabled: boolean) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsContextValue | null>(null);

function isFontSizeOption(value: unknown): value is FontSizeOption {
  return typeof value === "number" && FONT_SIZE_OPTIONS.includes(value as FontSizeOption);
}

function isTextDirection(value: unknown): value is TextDirection {
  return value === "rtl" || value === "ltr";
}

function isEntityProfileId(value: unknown): value is EntityProfileId {
  return typeof value === "string" && value in ENTITY_PROFILES;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readPersistedDisplaySettings(): DisplaySettings {
  if (typeof window === "undefined") {
    return DEFAULT_DISPLAY_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DISPLAY_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
    return {
      fontSize: isFontSizeOption(parsed.fontSize)
        ? parsed.fontSize
        : DEFAULT_DISPLAY_SETTINGS.fontSize,
      activeEntityProfileId: isEntityProfileId(parsed.activeEntityProfileId)
        ? parsed.activeEntityProfileId
        : DEFAULT_DISPLAY_SETTINGS.activeEntityProfileId,
      defaultTextDirection: isTextDirection(parsed.defaultTextDirection)
        ? parsed.defaultTextDirection
        : DEFAULT_DISPLAY_SETTINGS.defaultTextDirection,
      isBboxStructuralEditingEnabled: isBoolean(parsed.isBboxStructuralEditingEnabled)
        ? parsed.isBboxStructuralEditingEnabled
        : DEFAULT_DISPLAY_SETTINGS.isBboxStructuralEditingEnabled
    };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function DisplaySettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<DisplaySettings>(() => readPersistedDisplaySettings());

  const setFontSize = useCallback((fontSize: FontSizeOption) => {
    setSettings((previous) => {
      if (previous.fontSize === fontSize) {
        return previous;
      }
      return {
        ...previous,
        fontSize
      };
    });
  }, []);

  const setActiveEntityProfileId = useCallback((activeEntityProfileId: EntityProfileId) => {
    setSettings((previous) => {
      if (previous.activeEntityProfileId === activeEntityProfileId) {
        return previous;
      }
      return {
        ...previous,
        activeEntityProfileId
      };
    });
  }, []);

  const setDefaultTextDirection = useCallback((defaultTextDirection: TextDirection) => {
    setSettings((previous) => {
      if (previous.defaultTextDirection === defaultTextDirection) {
        return previous;
      }
      return {
        ...previous,
        defaultTextDirection
      };
    });
  }, []);

  const setIsBboxStructuralEditingEnabled = useCallback((isBboxStructuralEditingEnabled: boolean) => {
    setSettings((previous) => {
      if (previous.isBboxStructuralEditingEnabled === isBboxStructuralEditingEnabled) {
        return previous;
      }
      return {
        ...previous,
        isBboxStructuralEditingEnabled
      };
    });
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage write failures.
    }
  }, [settings]);

  useEffect(() => {
    const scale = FONT_SIZE_SCALE_BY_OPTION[settings.fontSize];
    document.documentElement.style.setProperty("--app-font-size-scale", String(scale));
    document.documentElement.dataset.appFontSize = String(settings.fontSize);
  }, [settings.fontSize]);

  const value = useMemo<DisplaySettingsContextValue>(
    () => ({
      settings,
      setFontSize,
      setActiveEntityProfileId,
      setDefaultTextDirection,
      setIsBboxStructuralEditingEnabled
    }),
    [settings, setFontSize, setActiveEntityProfileId, setDefaultTextDirection, setIsBboxStructuralEditingEnabled]
  );

  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>;
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error("useDisplaySettings must be used within DisplaySettingsProvider");
  }
  return context;
}
