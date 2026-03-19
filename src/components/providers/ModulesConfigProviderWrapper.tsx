"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/hooks/use-settings";
import { CustomServicesProvider } from "@/hooks/use-custom-services";

export function SettingsProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <CustomServicesProvider>{children}</CustomServicesProvider>
    </SettingsProvider>
  );
}
