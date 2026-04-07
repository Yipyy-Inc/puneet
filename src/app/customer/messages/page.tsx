"use client";

import { MessageCenter } from "@/components/messaging/MessageCenter";

export default function CustomerMessagesPage() {
  // Static customer ID for mock mode; swap with auth context when available.
  const customerId = 15;

  return <MessageCenter mode="customer" customerId={customerId} />;
}
