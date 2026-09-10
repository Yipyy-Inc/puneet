"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Send, Inbox } from "lucide-react";
import { BuyGiftCardFlow } from "./BuyGiftCardFlow";
import { SentGiftCardsList } from "./SentGiftCardsList";
import { ReceivedGiftCardsList } from "./ReceivedGiftCardsList";
import { useCustomerText } from "@/lib/customer/use-customer-text";

type GiftCardsTab = "send" | "sent" | "received";

interface GiftCardsTabsProps {
  facilityId: number;
  customerId: number;
  /** Initial active tab — email "check balance" links land on "received". */
  initialTab?: GiftCardsTab;
}

export function GiftCardsTabs({
  facilityId,
  customerId,
  initialTab = "send",
}: GiftCardsTabsProps) {
  const { t } = useCustomerText("giftCards");
  const [tab, setTab] = useState<GiftCardsTab>(initialTab);

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as GiftCardsTab)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="send" className="gap-1.5 text-xs sm:text-sm">
          <Gift className="hidden size-4 sm:inline" />
          {t("sendAGiftCard")}
        </TabsTrigger>
        <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
          <Send className="hidden size-4 sm:inline" />
          {t("cardsISent")}
        </TabsTrigger>
        <TabsTrigger value="received" className="gap-1.5 text-xs sm:text-sm">
          <Inbox className="hidden size-4 sm:inline" />
          {t("cardsIReceived")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="send" className="mt-6">
        <BuyGiftCardFlow
          facilityId={facilityId}
          onViewSent={() => setTab("sent")}
        />
      </TabsContent>

      <TabsContent value="sent" className="mt-6">
        <SentGiftCardsList
          facilityId={facilityId}
          customerId={customerId}
          onSendFirst={() => setTab("send")}
        />
      </TabsContent>

      <TabsContent value="received" className="mt-6">
        <ReceivedGiftCardsList
          facilityId={facilityId}
          customerId={customerId}
        />
      </TabsContent>
    </Tabs>
  );
}
