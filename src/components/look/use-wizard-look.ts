"use client";

import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { accentPalette, accentVariables } from "@/lib/look/accent-palette";

import type { Look } from "./look-context";

export type WizardPortal = "facility" | "customer";

/**
 * The booking wizard's look. Staff get the mock's blue from the CSS block; a
 * customer gets their facility's brand colour as the accent (Branding
 * settings, through the customer portal's facility context), or the mock's
 * yellow when the facility has set none.
 */
export function useWizardLook(portal: WizardPortal): Look {
  const { selectedFacility } = useCustomerFacility();
  if (portal === "facility") return { names: ["booking"] };
  return {
    names: ["booking"],
    vars: accentVariables(
      accentPalette(selectedFacility?.primaryColor ?? null),
    ),
  };
}
