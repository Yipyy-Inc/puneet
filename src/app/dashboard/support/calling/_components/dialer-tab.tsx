"use client";

import { useState } from "react";
import { Delete, Phone, PhoneOutgoing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { lookupFacilityByPhone } from "@/data/support-calls";
import { recordOutboundCall } from "@/lib/dialer-store";
import { useTwilioConfig } from "@/hooks/use-twilio-config";
import {
  dialDigits,
  placeOutboundCall,
  supportDialPrefix,
} from "@/lib/twilio-dialer";
import type { RecentCall } from "@/types/dialer";
import { RecentContacts } from "./recent-contacts";

const KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "*",
  "0",
  "#",
] as const;

// Sub-labels under each digit, like a physical phone keypad.
const KEY_SUBLABELS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "0": "+",
};

export function DialerTab() {
  const twilio = useTwilioConfig();
  const supportNumber = twilio.phoneNumbers[0] ?? "";
  const prefix = supportDialPrefix(supportNumber);

  const [value, setValue] = useState(() => prefix);
  const [dialing, setDialing] = useState(false);
  // Captured once at mount (keeps render pure); only feeds "called X ago" labels
  // on rows that render after hydration, so it never lands in the SSR output.
  const [nowMs] = useState(() => Date.now());

  const canDial = twilio.connected && !dialing && dialDigits(value).length >= 7;

  async function dialNumber(to: string) {
    const target = to.trim();
    if (!twilio.connected) {
      toast.error("Twilio isn't connected — configure it in Integrations.");
      return;
    }
    if (dialDigits(target).length < 7) {
      toast.error("Enter a valid number to dial.");
      return;
    }

    setDialing(true);
    const result = await placeOutboundCall({ to: target, from: supportNumber });
    setDialing(false);

    if (!result.ok) {
      toast.error(result.error ?? "The call could not be placed.");
      return;
    }

    const facility = lookupFacilityByPhone(target);
    toast.success(`Calling ${facility?.facilityName ?? target}…`);
    if (facility) {
      recordOutboundCall({
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
        number: target,
      });
    }
    setValue(prefix);
  }

  function onRedial(call: RecentCall) {
    setValue(call.number);
    void dialNumber(call.number);
  }

  const showBackspace = value.length > prefix.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outbound Dialer</CardTitle>
          <CardDescription>
            Make outbound calls using the Yipyy support number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-xs space-y-4">
            {/* Caller ID — the number calls go out from */}
            <div
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                twilio.connected
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground border-dashed",
              )}
            >
              <PhoneOutgoing className="size-3.5" />
              {twilio.connected && supportNumber ? (
                <span>
                  Calling from{" "}
                  <span className="tabular-nums">{supportNumber}</span>
                </span>
              ) : (
                <span>Twilio not connected</span>
              )}
            </div>

            {/* Number input (pre-seeded with the Yipyy support-number prefix) */}
            <div className="relative">
              <Input
                type="tel"
                inputMode="tel"
                aria-label="Number to dial"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canDial) void dialNumber(value);
                }}
                placeholder={supportNumber || "+1 (555) 000-0000"}
                className="h-12 pr-10 text-center font-mono text-xl font-semibold"
              />
              {showBackspace && (
                <button
                  type="button"
                  aria-label="Delete last digit"
                  onClick={() => setValue((v) => v.slice(0, -1))}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5"
                >
                  <Delete className="size-4" />
                </button>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant="outline"
                  aria-label={k}
                  onClick={() => setValue((v) => v + k)}
                  className="h-14 flex-col gap-0 rounded-2xl text-xl font-semibold"
                >
                  {k}
                  {KEY_SUBLABELS[k] && (
                    <span
                      aria-hidden
                      className="text-muted-foreground text-[9px] font-medium tracking-widest"
                    >
                      {KEY_SUBLABELS[k]}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setValue(prefix)}
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={() => void dialNumber(value)}
                disabled={!canDial}
                className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Phone className="size-4" />
                {dialing ? "Calling…" : "Dial"}
              </Button>
            </div>

            {!twilio.connected && (
              <p className="text-muted-foreground text-center text-xs">
                Connect Twilio in Integrations to place calls.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <RecentContacts nowMs={nowMs} onRedial={onRedial} />
    </div>
  );
}
