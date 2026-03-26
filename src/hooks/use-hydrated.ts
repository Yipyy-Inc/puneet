import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true once the component has hydrated on the client.
 * Replaces the `useEffect(() => setIsMounted(true), [])` pattern
 * without triggering set-state-in-effect lint warnings.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
