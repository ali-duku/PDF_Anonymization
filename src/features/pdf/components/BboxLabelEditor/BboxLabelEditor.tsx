import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BBOX_COMBOBOX_MAX_OPTIONS } from "../../constants/bbox";
import {
  formatArabicIndicDigits,
  normalizeArabicDigitsToLatin,
  parsePositiveIntegerFromArabicInput
} from "../../utils/arabicNumerals";
import styles from "./BboxLabelEditor.module.css";
import type { BboxLabelEditorProps } from "./BboxLabelEditor.types";

function BboxLabelEditorComponent({
  entityLabel,
  instanceNumber,
  options,
  onEntityLabelChange,
  onInstanceNumberChange,
  onRegisterCustomOption,
  onClose
}: BboxLabelEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const entityInputRef = useRef<HTMLInputElement | null>(null);
  const [draftEntityLabel, setDraftEntityLabel] = useState(entityLabel);
  const [isOptionsOpen, setIsOptionsOpen] = useState(true);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [numberInputValue, setNumberInputValue] = useState(
    instanceNumber === null ? "" : formatArabicIndicDigits(instanceNumber)
  );
  const entityInputId = useId();
  const numberInputId = useId();
  const listboxId = useId();

  const normalizedOptions = useMemo(() => {
    const deduped: string[] = [];
    for (const option of options) {
      if (!deduped.includes(option)) {
        deduped.push(option);
      }
    }
    return deduped;
  }, [options]);

  useEffect(() => {
    setDraftEntityLabel(entityLabel);
  }, [entityLabel]);

  useEffect(() => {
    setNumberInputValue(instanceNumber === null ? "" : formatArabicIndicDigits(instanceNumber));
  }, [instanceNumber]);

  useEffect(() => {
    entityInputRef.current?.focus();
    entityInputRef.current?.select();
  }, []);

  const filteredOptions = useMemo(() => {
    const query = draftEntityLabel.trim();
    if (!query) {
      return normalizedOptions.slice(0, BBOX_COMBOBOX_MAX_OPTIONS);
    }

    return normalizedOptions
      .filter((option) => option.includes(query))
      .slice(0, BBOX_COMBOBOX_MAX_OPTIONS);
  }, [draftEntityLabel, normalizedOptions]);

  useEffect(() => {
    if (filteredOptions.length === 0) {
      setActiveOptionIndex(0);
      return;
    }

    setActiveOptionIndex((previous) => Math.min(previous, filteredOptions.length - 1));
  }, [filteredOptions.length]);

  const commitCurrentValueAndClose = useCallback(() => {
    const trimmedLabel = draftEntityLabel.trim();
    const fallbackLabel = trimmedLabel || entityLabel.trim() || normalizedOptions[0] || "";

    if (fallbackLabel) {
      onEntityLabelChange(fallbackLabel);
      onRegisterCustomOption(fallbackLabel);
    }

    onClose();
  }, [draftEntityLabel, entityLabel, normalizedOptions, onClose, onEntityLabelChange, onRegisterCustomOption]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      const editorElement = editorRef.current;
      const isInsideEditor =
        Boolean(targetNode && editorElement?.contains(targetNode)) ||
        (editorElement ? event.composedPath().includes(editorElement) : false);

      if (isInsideEditor) {
        return;
      }

      commitCurrentValueAndClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [commitCurrentValueAndClose]);

  const handleOptionPick = useCallback(
    (nextValue: string) => {
      setDraftEntityLabel(nextValue);
      onEntityLabelChange(nextValue);
      onRegisterCustomOption(nextValue);
      onClose();
    },
    [onClose, onEntityLabelChange, onRegisterCustomOption]
  );

  const showDropdown = isOptionsOpen && filteredOptions.length > 0;

  return (
    <div
      ref={editorRef}
      className={styles.editor}
      data-editor
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className={styles.headerRow}>
        <div className={styles.comboboxField}>
          <label className={styles.fieldLabel} htmlFor={entityInputId}>
            Entity
          </label>
          <input
            id={entityInputId}
            ref={entityInputRef}
            className={styles.comboboxInput}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? listboxId : undefined}
            aria-activedescendant={
              showDropdown ? `${listboxId}-option-${activeOptionIndex}` : undefined
            }
            value={draftEntityLabel}
            onFocus={() => {
              setIsOptionsOpen(true);
            }}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setDraftEntityLabel(nextValue);
              setActiveOptionIndex(0);
              setIsOptionsOpen(true);
              onEntityLabelChange(nextValue);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                commitCurrentValueAndClose();
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsOptionsOpen(true);
                setActiveOptionIndex((previous) =>
                  filteredOptions.length === 0 ? 0 : Math.min(previous + 1, filteredOptions.length - 1)
                );
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                setIsOptionsOpen(true);
                setActiveOptionIndex((previous) => Math.max(previous - 1, 0));
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                const highlighted = filteredOptions[activeOptionIndex];
                if (showDropdown && highlighted) {
                  handleOptionPick(highlighted);
                  return;
                }
                commitCurrentValueAndClose();
              }
            }}
          />

          {showDropdown && (
            <ul id={listboxId} role="listbox" className={styles.optionsList}>
              {filteredOptions.map((option, index) => {
                const isActive = index === activeOptionIndex;
                return (
                  <li key={`${option}-${index}`} role="presentation">
                    <button
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`${styles.optionButton} ${isActive ? styles.optionButtonActive : ""}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleOptionPick(option);
                      }}
                    >
                      {option}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.numberField}>
          <label className={styles.fieldLabel} htmlFor={numberInputId}>
            Number
          </label>
          <input
            id={numberInputId}
            className={styles.numberInput}
            type="text"
            inputMode="numeric"
            value={numberInputValue}
            onChange={(event) => {
              const rawValue = event.currentTarget.value;
              const normalizedDigits = normalizeArabicDigitsToLatin(rawValue).replace(/[^\d]/g, "");
              if (!normalizedDigits) {
                setNumberInputValue("");
                onInstanceNumberChange(null);
                return;
              }

              const parsedValue = parsePositiveIntegerFromArabicInput(normalizedDigits);
              if (parsedValue === null) {
                setNumberInputValue("");
                onInstanceNumberChange(null);
                return;
              }

              setNumberInputValue(formatArabicIndicDigits(parsedValue));
              onInstanceNumberChange(parsedValue);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const BboxLabelEditor = memo(BboxLabelEditorComponent);
