"use client";

import { SettingsProviderWrapper } from "@/components/providers/ModulesConfigProviderWrapper";

export default function TestGroomingBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsProviderWrapper>{children}</SettingsProviderWrapper>;
}
