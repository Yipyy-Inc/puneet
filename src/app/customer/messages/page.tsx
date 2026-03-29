"use client";

import { CustomerMessageCenter } from "@/components/customer/messaging/CustomerMessageCenter";

export default function CustomerMessagesPage() {
  // Static client ID for now (would come from auth in production)
  const clientId = 15;

  return <CustomerMessageCenter clientId={clientId} />;
}
