"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/hooks/use-settings";
import { CustomServicesProvider } from "@/hooks/use-custom-services";
import { RoomsProvider } from "@/hooks/use-rooms";
import { DaycareAreasProvider } from "@/hooks/use-daycare-areas";
import { GroomingStationsProvider } from "@/hooks/use-grooming-stations";
import { MobileGroomingProvider } from "@/hooks/use-mobile-grooming";
import { GroomingWaitlistProvider } from "@/hooks/use-grooming-waitlist";
import { GroomingSchedulingProvider } from "@/hooks/use-grooming-scheduling";

export function SettingsProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CustomServicesProvider>
        <RoomsProvider>
          <DaycareAreasProvider>
            <GroomingStationsProvider>
              <MobileGroomingProvider>
                <GroomingWaitlistProvider>
                  <GroomingSchedulingProvider>
                    {children}
                  </GroomingSchedulingProvider>
                </GroomingWaitlistProvider>
              </MobileGroomingProvider>
            </GroomingStationsProvider>
          </DaycareAreasProvider>
        </RoomsProvider>
      </CustomServicesProvider>
    </SettingsProvider>
  );
}
