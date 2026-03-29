"use client";

import { useState } from "react";
import { FacilityThreadList } from "./FacilityThreadList";
import { CustomerConversation } from "./CustomerConversation";
import { clientCommunications } from "@/data/communications";

export function CustomerMessageCenter({ clientId }: { clientId: number }) {
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(
    null,
  );

  const clientComms = clientCommunications.filter(
    (c) => c.clientId === clientId,
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left panel — hidden on mobile when conversation is selected */}
      <div
        className={
          selectedFacilityId ? "hidden md:flex" : "flex w-full md:w-auto"
        }
      >
        <FacilityThreadList
          communications={clientComms}
          selectedFacilityId={selectedFacilityId}
          onSelectFacility={setSelectedFacilityId}
        />
      </div>

      {/* Center panel — full width on mobile */}
      <div
        className={
          selectedFacilityId ? "flex flex-1" : "hidden md:flex md:flex-1"
        }
      >
        <CustomerConversation
          facilityId={selectedFacilityId}
          communications={clientComms}
          onBack={() => setSelectedFacilityId(null)}
        />
      </div>
    </div>
  );
}
