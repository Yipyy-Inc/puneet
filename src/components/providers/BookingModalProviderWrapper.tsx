"use client";

import { ReactNode } from "react";
import { BookingModalProvider } from "@/hooks/use-booking-modal";

export function BookingModalProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <BookingModalProvider>{children}</BookingModalProvider>;
}
