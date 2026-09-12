"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/hooks/use-settings";
import {
  CustomServicesProvider,
  type CustomServicesAudience,
} from "@/hooks/use-custom-services";
import { RoomsProvider } from "@/hooks/use-rooms";
import { DaycareAreasProvider } from "@/hooks/use-daycare-areas";
import { GroomingStationsProvider } from "@/hooks/use-grooming-stations";
import { MobileGroomingProvider } from "@/hooks/use-mobile-grooming";
import { GroomingWaitlistProvider } from "@/hooks/use-grooming-waitlist";

/**
 * `audience` says who is reading: the customer portal passes "customer", so a
 * customer is shown the services their facility OFFERS (a projection without
 * the facility's own notes) rather than asking for staff settings they
 * cannot read. Every other portal is staff.
 */
export function SettingsProviderWrapper({
  children,
  audience = "staff",
}: {
  children: ReactNode;
  audience?: CustomServicesAudience;
}) {
  return (
    <SettingsProvider>
      <CustomServicesProvider audience={audience}>
        <RoomsProvider>
          <DaycareAreasProvider>
            <GroomingStationsProvider>
              <MobileGroomingProvider>
                <GroomingWaitlistProvider>{children}</GroomingWaitlistProvider>
              </MobileGroomingProvider>
            </GroomingStationsProvider>
          </DaycareAreasProvider>
        </RoomsProvider>
      </CustomServicesProvider>
    </SettingsProvider>
  );
}
