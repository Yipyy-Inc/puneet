import { useCallback, useSyncExternalStore } from "react";

/**
 * Reactive CSS media query via `useSyncExternalStore` (the canonical, React-
 * Compiler-safe way to subscribe to `matchMedia`). `serverDefault` is used for
 * SSR and the hydration render so the server and first client render agree;
 * immediately after hydration the real match takes over.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
