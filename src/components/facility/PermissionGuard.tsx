"use client";

import { type ReactNode } from "react";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import type { PermissionKey } from "@/types/facility-staff";

interface PermissionGuardProps {
  /** Permission(s) the acting viewer must have to see `children`. */
  require: PermissionKey | PermissionKey[];
  /**
   * When `require` is an array: `"all"` needs every key (default), `"any"`
   * needs at least one. Ignored for a single key.
   */
  mode?: "all" | "any";
  children: ReactNode;
  /**
   * Rendered when the check fails. Defaults to nothing — the spec requires
   * unauthorized features to be entirely absent (no "locked"/"upgrade" state).
   */
  fallback?: ReactNode;
}

/**
 * Renders `children` only when the acting facility viewer satisfies `require`;
 * otherwise renders `fallback` (nothing by default). SECURITY: the guard hides
 * — it never shows a disabled/locked placeholder. It reads the single effective
 * permission map from the RBAC resolver (F0.2).
 *
 * TODO: move to server/JWT enforcement — this is client-side display gating.
 */
export function PermissionGuard({
  require,
  mode = "all",
  children,
  fallback = null,
}: PermissionGuardProps) {
  const permissions = useEffectivePermissions();

  const keys = Array.isArray(require) ? require : [require];
  // A key is "granted" when its effective value is a scope (not `false`).
  const has = (key: PermissionKey) => permissions[key] !== false;

  const satisfied =
    keys.length === 0
      ? true
      : mode === "any"
        ? keys.some(has)
        : keys.every(has);

  return <>{satisfied ? children : fallback}</>;
}
