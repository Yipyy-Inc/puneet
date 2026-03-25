import { type RefObject, useCallback, useRef, useEffect } from "react";

/**
 * Hook for inserting text at the current cursor position in an input/textarea.
 * Falls back to appending if no selection is available.
 * Uses a ref for `value` so the returned callback is stable across keystrokes.
 */
export function useInsertAtCursor(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string,
  onChange: (newValue: string) => void,
) {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  return useCallback(
    (textToInsert: string) => {
      const el = ref.current;
      const currentValue = valueRef.current;
      if (el) {
        const start = el.selectionStart ?? currentValue.length;
        const end = el.selectionEnd ?? currentValue.length;
        const newValue =
          currentValue.slice(0, start) + textToInsert + currentValue.slice(end);
        onChange(newValue);

        requestAnimationFrame(() => {
          const newPos = start + textToInsert.length;
          el.setSelectionRange(newPos, newPos);
          el.focus();
        });
      } else {
        onChange(currentValue + " " + textToInsert);
      }
    },
    [ref, onChange],
  );
}
