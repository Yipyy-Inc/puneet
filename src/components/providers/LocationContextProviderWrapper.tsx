"use client";

import { LocationContextProvider } from "@/hooks/use-location-context";

export function LocationContextProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocationContextProvider>{children}</LocationContextProvider>;
}
