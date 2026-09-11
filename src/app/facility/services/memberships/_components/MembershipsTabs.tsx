"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, CreditCard, Wallet, BarChart3 } from "lucide-react";
import { PlansTab } from "./plans/PlansTab";
import { SubscribersTab } from "./subscribers/SubscribersTab";
import { CreditsTab } from "./credits/CreditsTab";
import { useMembershipPlans, useMemberships } from "@/lib/api/memberships";
import { useStoreCredit } from "@/lib/api/store-credit";

const InsightsTab = dynamic(
  () => import("./insights/InsightsTab").then((m) => m.InsightsTab),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
        Loading insights…
      </div>
    ),
  },
);

export function MembershipsTabs() {
  const [tab, setTab] = useState<
    "plans" | "subscribers" | "credits" | "insights"
  >("plans");
  // The counts on the tabs are the rows the tabs show, not the fixture's.
  const planCount = useMembershipPlans().data?.length ?? 0;
  const subscriberCount = useMemberships().data?.length ?? 0;
  const creditCount = useStoreCredit().data?.accounts.length ?? 0;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList className="bg-muted/40">
        <TabsTrigger value="plans">
          <Crown className="mr-2 size-4" />
          Plans
          <span className="bg-background/80 text-muted-foreground ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium">
            {planCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="subscribers">
          <CreditCard className="mr-2 size-4" />
          Subscribers
          <span className="bg-background/80 text-muted-foreground ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium">
            {subscriberCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="credits">
          <Wallet className="mr-2 size-4" />
          Prepaid Credits
          <span className="bg-background/80 text-muted-foreground ml-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium">
            {creditCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="insights">
          <BarChart3 className="mr-2 size-4" />
          Insights
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plans" className="mt-4">
        <PlansTab />
      </TabsContent>
      <TabsContent value="subscribers" className="mt-4">
        <SubscribersTab />
      </TabsContent>
      <TabsContent value="credits" className="mt-4">
        <CreditsTab />
      </TabsContent>
      <TabsContent value="insights" className="mt-4">
        <InsightsTab />
      </TabsContent>
    </Tabs>
  );
}
