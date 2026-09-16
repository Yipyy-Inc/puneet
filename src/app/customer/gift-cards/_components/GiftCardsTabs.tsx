"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Send, Inbox } from "lucide-react";
import { BuyGiftCardFlow } from "./BuyGiftCardFlow";
import { SentGiftCardsList } from "./SentGiftCardsList";
import { ReceivedGiftCardsList } from "./ReceivedGiftCardsList";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useCustomerFacility } from "@/hooks/use-customer-facility";

type GiftCardsTab = "send" | "sent" | "received";

interface GiftCardsTabsProps {
  /** Initial active tab — email "check balance" links land on "received". */
  initialTab?: GiftCardsTab;
}

export function GiftCardsTabs({ initialTab = "send" }: GiftCardsTabsProps) {
  const { t } = useCustomerText("giftCards");
  const [tab, setTab] = useState<GiftCardsTab>(initialTab);

  // WHO is asking comes from the session, not from the page. The page used to
  // hand down `customerId={15}` — Alice Johnson — so every owner read her
  // cards. `-1` matches no client, which is the right answer for the moment
  // before the session resolves: nothing, rather than somebody.
  const { client } = useCurrentCustomer();
  const customerId = client?.id ?? -1;

  // WHICH facility stays the fixture's selection, as on the billing tabs: these
  // lists filter `src/data/gift-cards`, and the selected id matches none of
  // those rows — see the block in use-customer-facility.tsx for why that
  // mismatch must NOT be "corrected" while a real client ref can collide with a
  // fixture client id. Empty is the correct output until this reads Postgres.
  const { selectedFacility } = useCustomerFacility();
  const facilityId = selectedFacility?.id ?? -1;

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
