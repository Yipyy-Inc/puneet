"use client";

import { ReactNode } from "react";
import { SettingsProvider } from "@/hooks/use-settings";

export function SettingsProviderWrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
