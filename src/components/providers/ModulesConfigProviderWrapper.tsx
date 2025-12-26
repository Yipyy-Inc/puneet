"use client";

import { ReactNode } from "react";
import { ModulesConfigProvider } from "@/hooks/use-modules-config";

export function ModulesConfigProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <ModulesConfigProvider>{children}</ModulesConfigProvider>;
}
