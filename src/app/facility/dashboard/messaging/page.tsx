"use client";

import { CommunicationHub } from "@/components/messaging/CommunicationHub";

export default function FacilityMessagingPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      <CommunicationHub />
    </div>
  );
}
