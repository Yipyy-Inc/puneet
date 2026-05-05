import type { AutomationRule } from "@/types/communications";
import type { Location, HQSettings } from "@/types/location";

export interface AutomationFiringContext {
  /** The location the triggering event happened at */
  eventLocationId: string;
  /** All locations for resolving identity */
  locations: Location[];
  /** HQ settings to honor sharedAutomations toggle */
  settings: HQSettings;
}

export interface ResolvedAutomationFiring {
  /** Location-stamped sender identity */
  fromName: string;
  fromPhone: string;
  fromEmail: string;
  brandColor: string;
  /** Location ID stamped on the outgoing message */
  locationId: string;
}

/**
 * Decide whether a rule should fire for an event happening at `eventLocationId`,
 * and if so produce the location-stamped identity to send from.
 *
 * Returns null when the rule should NOT fire (out of scope).
 */
export function resolveAutomationFiring(
  rule: AutomationRule,
  ctx: AutomationFiringContext,
): ResolvedAutomationFiring | null {
  if (!rule.enabled) return null;

  const scope = rule.conditions?.locationIds ?? [];
  const isGlobalRule = scope.length === 0;

  // If rule is scoped and the event location isn't in scope, skip.
  if (!isGlobalRule && !scope.includes(ctx.eventLocationId)) return null;

  // If sharedAutomations is OFF and the rule is global (no scope),
  // still fire — but stamped from the event location's identity.
  // (sharedAutomations OFF + scoped rule already handled above.)
  const loc =
    ctx.locations.find((l) => l.id === ctx.eventLocationId) ??
    ctx.locations.find((l) => l.isPrimary) ??
    ctx.locations[0];

  if (!loc) return null;

  return {
    fromName: loc.name,
    fromPhone: loc.phone,
    fromEmail: loc.email,
    brandColor: loc.color,
    locationId: loc.id,
  };
}
