"use client";

import { useEffect } from "react";

import { getCurrentUserId, setCurrentUserId } from "@/lib/role-utils";

/**
 * Writes the mock-record id for the signed-in user into localStorage, where
 * the groomer and staff surfaces still look for it.
 *
 * See lib/auth/legacy-identity.ts for why this exists and when it dies. The
 * id is resolved on the server from a verified session email — this component
 * only stores it, so nothing here decides who anyone is.
 */
export function LegacyIdentityBridge({ staffId }: { staffId: string | null }) {
  useEffect(() => {
    if (!staffId) return;
    // Don't fight /employee/select, which deliberately lets someone work as a
    // different staff member. Only fill the gap when nothing is set.
    if (getCurrentUserId()) return;
    setCurrentUserId(staffId);
  }, [staffId]);

  return null;
}
