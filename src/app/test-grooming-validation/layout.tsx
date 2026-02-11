"use client";

import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";

export default function TestGroomingValidationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsProviderWrapper>{children}</SettingsProviderWrapper>;
}
