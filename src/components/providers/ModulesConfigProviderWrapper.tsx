"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/hooks/use-settings";
import { CustomServicesProvider } from "@/hooks/use-custom-services";
import { RoomsProvider } from "@/hooks/use-rooms";
import { DaycareAreasProvider } from "@/hooks/use-daycare-areas";
import { GroomingStationsProvider } from "@/hooks/use-grooming-stations";

export function SettingsProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CustomServicesProvider>
        <RoomsProvider>
          <DaycareAreasProvider>
            <GroomingStationsProvider>{children}</GroomingStationsProvider>
          </DaycareAreasProvider>
        </RoomsProvider>
      </CustomServicesProvider>
    </SettingsProvider>
  );
}
