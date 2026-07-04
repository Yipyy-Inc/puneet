"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Send, Inbox } from "lucide-react";
import { BuyGiftCardFlow } from "./BuyGiftCardFlow";
import { SentGiftCardsList } from "./SentGiftCardsList";
import { ReceivedGiftCardsList } from "./ReceivedGiftCardsList";

interface GiftCardsTabsProps {
  facilityId: number;
  customerId: number;
}

export function GiftCardsTabs({ facilityId, customerId }: GiftCardsTabsProps) {
  return (
    <Tabs defaultValue="send">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="send" className="gap-1.5 text-xs sm:text-sm">
          <Gift className="hidden size-4 sm:inline" />
          Send a gift card
        </TabsTrigger>
        <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
          <Send className="hidden size-4 sm:inline" />
          Cards I sent
        </TabsTrigger>
        <TabsTrigger value="received" className="gap-1.5 text-xs sm:text-sm">
          <Inbox className="hidden size-4 sm:inline" />
          Cards I received
        </TabsTrigger>
      </TabsList>

      <TabsContent value="send" className="mt-6">
        <BuyGiftCardFlow facilityId={facilityId} />
      </TabsContent>

      <TabsContent value="sent" className="mt-6">
        <SentGiftCardsList facilityId={facilityId} customerId={customerId} />
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
