"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  addTwilioNumber,
  disconnectTwilio,
  maskSecret,
  removeTwilioNumber,
  testTwilioConnection,
  twilioWebhooks,
  updateTwilioConfig,
  useTwilioConfig,
} from "@/hooks/use-twilio-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function TwilioIntegrationCard() {
  const cfg = useTwilioConfig();
  const hooks = twilioWebhooks(cfg.webhookBaseUrl);
  const [newNumber, setNewNumber] = useState("");

  function test() {
    const ok = testTwilioConnection(new Date());
    if (ok) toast.success("Twilio connection verified");
    else toast.error("Add an Account SID and Auth Token first");
  }

  return (
    <Card className="border-violet-500/20">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-rose-500 to-red-600 text-white shadow-sm">
            <Phone className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Twilio</h2>
              <Badge variant="secondary">Support Calling</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Powers the inbound queue, IVR routing and the outbound dialer.
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto gap-1",
              cfg.connected
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-muted bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                cfg.connected ? "bg-emerald-500" : "bg-muted-foreground",
              )}
            />
            {cfg.connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        {/* Credentials */}
        <div className="grid gap-4 sm:grid-cols-2">
          <CredentialField
            id="twilio-sid"
            label="Account SID"
            value={cfg.accountSid}
            onChange={(v) => updateTwilioConfig({ accountSid: v })}
          />
          <CredentialField
            id="twilio-token"
            label="Auth Token"
            value={cfg.authToken}
            onChange={(v) => updateTwilioConfig({ authToken: v })}
          />
        </div>

        {/* Phone numbers */}
        <div className="space-y-2">
          <Label>Support Phone Number(s)</Label>
          <div className="space-y-1.5">
            {cfg.phoneNumbers.map((n) => (
              <div
                key={n}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <Phone className="text-muted-foreground size-4 shrink-0" />
                <span className="flex-1 font-mono">{n}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground/60 hover:text-destructive size-7"
                  onClick={() => removeTwilioNumber(n)}
                  aria-label="Remove number"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="+1 (___) ___-____"
              className="font-mono"
            />
            <Button
              variant="outline"
              onClick={() => {
                addTwilioNumber(newNumber);
                setNewNumber("");
              }}
              disabled={!newNumber.trim()}
            >
              <Plus className="mr-1.5 size-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Webhook URLs */}
        <div className="space-y-2">
          <Label>Twilio Webhook URLs</Label>
          <p className="text-muted-foreground text-xs">
            Paste these into your Twilio number&apos;s voice configuration.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <WebhookRow
              label="Inbound Voice"
              url={hooks.inboundVoice}
              hint="→ Live tab queue & IVR routing"
            />
            <WebhookRow
              label="Outbound / Dialer"
              url={hooks.outboundDial}
              hint="→ Outbound dialer"
            />
            <WebhookRow
              label="Status Callback"
              url={hooks.statusCallback}
              hint="Call progress events"
            />
            <WebhookRow
              label="Recording"
              url={hooks.recording}
              hint="Recording-ready callback"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button variant="outline" onClick={test}>
            <RefreshCw className="mr-2 size-4" />
            Test Connection
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => toast.success("Twilio configuration saved")}
          >
            <Save className="mr-2 size-4" />
            Save
          </Button>
          {cfg.connected && (
            <Button
              variant="ghost"
              className="text-destructive ml-auto"
              onClick={() => {
                disconnectTwilio();
                toast.success("Twilio disconnected");
              }}
            >
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CredentialField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          aria-label={show ? "Hide" : "Reveal"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <ShieldCheck className="size-3" />
        Stored securely · {maskSecret(value)}
      </p>
    </div>
  );
}

function WebhookRow({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{label}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            toast.success("Webhook URL copied");
          }}
          aria-label="Copy URL"
        >
          <Copy className="size-3.5" />
        </Button>
      </div>
      <p className="text-muted-foreground truncate font-mono text-[11px]">
        {url}
      </p>
      <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
        <Check className="size-2.5 text-emerald-500" />
        {hint}
      </p>
    </div>
  );
}
