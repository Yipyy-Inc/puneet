import { useEffect, useRef } from "react";

/**
 * Detects USB/Bluetooth HID barcode scanners.
 *
 * Hardware scanners act as keyboards: they type characters very fast
 * (< 50 ms between keystrokes) then press Enter. This hook intercepts
 * that pattern on the target input and fires onScan, keeping manual
 * typing working normally.
 */
export function useHardwareBarcodeScanner(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onScan: (code: string) => void,
) {
  // Ref so the event listener is registered once but always calls
  // the latest onScan without needing the listener to be re-registered.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    let buffer = "";
    let lastKeyTime = 0;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      if (e.key === "Enter") {
        // Only intercept if we have a scanner-length buffer typed quickly
        if (buffer.length >= 4) {
          e.preventDefault();
          e.stopPropagation();
          const code = buffer;
          buffer = "";
          if (clearTimer) clearTimeout(clearTimer);
          onScanRef.current(code);
        }
        // Short buffer = manual typing → let Enter propagate (form submit)
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, Ctrl, Alt, Arrow, etc.

      // If the gap since the last key exceeds the threshold, it's a new
      // manual typing session — reset whatever partial scanner buffer we had.
      if (buffer.length > 0 && now - lastKeyTime > 80) {
        buffer = "";
      }

      lastKeyTime = now;
      buffer += e.key;

      // Reset buffer if the next key takes too long (slow = human typing)
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        buffer = "";
      }, 80);
    };

    input.addEventListener("keydown", handleKeyDown);
    return () => {
      input.removeEventListener("keydown", handleKeyDown);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [inputRef]); // inputRef is stable (created with useRef in the parent)
}
