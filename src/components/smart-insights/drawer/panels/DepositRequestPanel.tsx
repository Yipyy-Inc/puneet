"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, DollarSign, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.5 Take Action — list of bookings with uncollected deposits.
 * Per-row "Send deposit request" — choose SMS or email channel.
 */

interface BookingRow {
  id: string;
  clientId: string;
  clientName: string;
  petName: string;
  date: string;
  service: string;
  bookingValue: number;
  depositRequired: number;
  email: string;
  phone: string;
}

const BOOKINGS: BookingRow[] = [
  { id: "BK-30021", clientId: "c-1101", clientName: "Aaron Smith", petName: "Bo", date: "May 24", service: "Boarding · 3 nights", bookingValue: 360, depositRequired: 100, email: "asmith@example.com", phone: "+1 514-555-0021" },
  { id: "BK-30024", clientId: "c-1102", clientName: "Maya Brown", petName: "Luna", date: "May 25", service: "Grooming · Full", bookingValue: 135, depositRequired: 40, email: "mbrown@example.com", phone: "+1 514-555-0024" },
  { id: "BK-30029", clientId: "c-1103", clientName: "Felix Lin", petName: "Cooper", date: "May 26", service: "Boarding · 2 nights", bookingValue: 240, depositRequired: 80, email: "flin@example.com", phone: "+1 514-555-0029" },
  { id: "BK-30033", clientId: "c-1104", clientName: "Sara Khan", petName: "Daisy", date: "May 27", service: "Boarding · 5 nights", bookingValue: 600, depositRequired: 150, email: "skhan@example.com", phone: "+1 514-555-0033" },
  { id: "BK-30041", clientId: "c-1105", clientName: "Tom Hwang", petName: "Pepper", date: "May 28", service: "Grooming · Full", bookingValue: 135, depositRequired: 40, email: "thwang@example.com", phone: "+1 514-555-0041" },
  { id: "BK-30046", clientId: "c-1106", clientName: "Léa Drouin", petName: "Otis", date: "Jun 01", service: "Boarding · 2 nights", bookingValue: 240, depositRequired: 80, email: "ldrouin@example.com", phone: "+1 514-555-0046" },
  { id: "BK-30052", clientId: "c-1107", clientName: "Pierre Roy", petName: "Mango", date: "Jun 02", service: "Boarding · 7 nights", bookingValue: 840, depositRequired: 200, email: "proy@example.com", phone: "+1 514-555-0052" },
  { id: "BK-30058", clientId: "c-1108", clientName: "Anna Beaulieu", petName: "Charlie", date: "Jun 03", service: "Boarding · 3 nights", bookingValue: 360, depositRequired: 100, email: "abeaulieu@example.com", phone: "+1 514-555-0058" },
  { id: "BK-30063", clientId: "c-1109", clientName: "Mike Cho", petName: "Joey", date: "Jun 05", service: "Grooming · Spa", bookingValue: 160, depositRequired: 50, email: "mcho@example.com", phone: "+1 514-555-0063" },
  { id: "BK-30068", clientId: "c-1110", clientName: "Sophie Wu", petName: "Sage", date: "Jun 06", service: "Boarding · 4 nights", bookingValue: 480, depositRequired: 120, email: "swu@example.com", phone: "+1 514-555-0068" },
  { id: "BK-30072", clientId: "c-1111", clientName: "Ethan Mac", petName: "Atlas", date: "Jun 07", service: "Boarding · 2 nights", bookingValue: 240, depositRequired: 80, email: "emac@example.com", phone: "+1 514-555-0072" },
  { id: "BK-30077", clientId: "c-1112", clientName: "Iris Park", petName: "Hazel", date: "Jun 09", service: "Boarding · 5 nights", bookingValue: 600, depositRequired: 150, email: "ipark@example.com", phone: "+1 514-555-0077" },
  { id: "BK-30084", clientId: "c-1113", clientName: "Henry Kim", petName: "Rocky", date: "Jun 10", service: "Boarding · 3 nights", bookingValue: 360, depositRequired: 100, email: "hkim@example.com", phone: "+1 514-555-0084" },
  { id: "BK-30089", clientId: "c-1114", clientName: "Quinn Diaz", petName: "Theo", date: "Jun 12", service: "Grooming · Spa", bookingValue: 160, depositRequired: 50, email: "qdiaz@example.com", phone: "+1 514-555-0089" },
];

const TOTAL_OUTSTANDING = BOOKINGS.reduce((s, b) => s + b.depositRequired, 0);

export function DepositRequestPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [sent, setSent] = useState<Set<string>>(new Set());

  const markSent = (id: string) => {
    setSent((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <DollarSign className="size-3.5" />
          {BOOKINGS.length} bookings · ${TOTAL_OUTSTANDING} outstanding
        </div>
        <p className="text-muted-foreground text-xs">
          Click <b>SMS</b> or <b>Email</b> on each row to send a payment link.
        </p>
      </div>

      <ul className="max-h-[26rem] space-y-2 overflow-y-auto">
        {BOOKINGS.map((b) => {
          const isSent = sent.has(b.id);
          return (
            <li
              key={b.id}
              data-sent={isSent}
              className="space-y-2 rounded-md border p-3 text-sm data-[sent=true]:bg-emerald-50/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      <Link
                        href={insightLinks.client(b.clientId)}
                        className="hover:text-primary hover:underline"
                      >
                        {b.clientName}
                      </Link>{" "}
                      · {b.petName}
                    </p>
                    {isSent && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-800"
                      >
                        <Check className="size-3" />
                        Sent
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    <Link
                      href={insightLinks.booking(b.id)}
                      className="hover:text-primary hover:underline"
                    >
                      {b.id}
                    </Link>{" "}
                    · {b.date} · {b.service} · ${b.bookingValue} total
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  ${b.depositRequired}
                </span>
              </div>
              <div className="flex gap-2 border-t pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => markSent(b.id)}
                  disabled={isSent}
                >
                  <MessageSquare className="mr-1.5 size-3.5" />
                  SMS
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => markSent(b.id)}
                  disabled={isSent}
                >
                  <Mail className="mr-1.5 size-3.5" />
                  Email
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel={`Mark ${sent.size}/${BOOKINGS.length} sent`}
          onPrimary={() => onComplete()}
          primaryDisabled={sent.size === 0}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
