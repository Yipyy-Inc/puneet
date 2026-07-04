"use client";

import type { LucideIcon } from "lucide-react";
import { CreditCard, Mail, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TwilioIntegrationCard } from "@/components/integrations/twilio-integration-card";
import { CloverIntegrationCard } from "@/components/integrations/clover-integration-card";

const OTHER: {
  name: string;
  desc: string;
  icon: LucideIcon;
  badge: string;
}[] = [
  {
    name: "Stripe",
    desc: "Optional secondary card processor",
    icon: CreditCard,
    badge: "Secondary",
  },
  {
    name: "SendGrid",
    desc: "Transactional email",
    icon: Mail,
    badge: "Coming soon",
  },
  {
    name: "Slack",
    desc: "Team notifications",
    icon: MessageSquare,
    badge: "Coming soon",
  },
];

export function IntegrationsClient() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Yipyy to the third-party services that power the platform.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Featured integrations
        </h2>
        <CloverIntegrationCard />
        <TwilioIntegrationCard />
      </div>

      <div>
        <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
          More integrations
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER.map((o) => {
            const Icon = o.icon;
            return (
              <Card key={o.name}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.name}</p>
                    <p className="text-muted-foreground text-xs">{o.desc}</p>
                  </div>
                  <Badge variant="outline">{o.badge}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
