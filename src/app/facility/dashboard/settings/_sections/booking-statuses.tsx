"use client";

import { BookingStatusSettings } from "@/components/facility/BookingStatusSettings";

import { StatusColorSettings } from "@/components/facility/StatusColorSettings";

export function BookingStatusesSection() {
  return (
    <div className="space-y-6">
      <BookingStatusSettings />
      <StatusColorSettings />
    </div>
  );
}
