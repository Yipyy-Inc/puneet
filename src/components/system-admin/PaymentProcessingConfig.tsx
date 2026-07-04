"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  Repeat,
  ShieldCheck,
  TestTube,
  Webhook,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  maskSecret,
  updateCloverConfig,
  useCloverConfig,
  type CloverEnvironment,
} from "@/lib/clover-config-store";
import {
  sendCloverTestCharge,
  testCloverConnection,
  type CloverConnectionTest,
  type CloverTestChargeResult,
} from "@/lib/fiserv-payment-service";

const WEBHOOK_URL = "https://app.yipyy.com/api/clover/webhook";
const WEBHOOK_EVENTS = [
  "payment.succeeded",
  "payment.failed",
  "refund.created",
  "dispute.created",
];
const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "AUD"];
// Matches the dunning sequence (src/lib/api/dunning.ts).
const RETRY_DAYS = [1, 7, 14];

function copy(value: string, label: string) {
  navigator.clipboard?.writeText(value);
  toast.success(`${label} copied`);
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof CreditCard;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className="size-4" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function PaymentProcessingConfig() {
  const cfg = useCloverConfig();

  const [editing, setEditing] = useState(false);
  const [merchantId, setMerchantId] = useState(cfg.merchantId);
  const [appSecret, setAppSecret] = useState(cfg.appSecret);
  const [appId, setAppId] = useState(cfg.appId);

  const [testing, setTesting] = useState(false);
  const [connResult, setConnResult] = useState<CloverConnectionTest | null>(
    null,
  );
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [charging, setCharging] = useState(false);
  const [chargeResult, setChargeResult] =
    useState<CloverTestChargeResult | null>(null);

  const showForm = editing || !cfg.configured;

  const startEdit = () => {
    setMerchantId(cfg.merchantId);
    setAppSecret(cfg.appSecret);
    setAppId(cfg.appId);
    setEditing(true);
  };

  const saveCredentials = () => {
    if (!merchantId.trim() || !appSecret.trim() || !appId.trim()) {
      toast.error("Enter Merchant ID, Private App Secret and App ID.");
      return;
    }
    updateCloverConfig({
      merchantId: merchantId.trim(),
      appSecret: appSecret.trim(),
      appId: appId.trim(),
      configured: true,
    });
    setEditing(false);
    toast.success("Clover credentials saved (encrypted).");
  };

  const testConnection = async () => {
    setTesting(true);
    setConnResult(null);
    try {
      const result = await testCloverConnection({
        merchantId: showForm ? merchantId : cfg.merchantId,
        appSecret: showForm ? appSecret : cfg.appSecret,
        appId: showForm ? appId : cfg.appId,
        environment: cfg.environment,
      });
      setConnResult(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setTesting(false);
    }
  };

  const setEnvironment = (env: CloverEnvironment) => {
    if (env === cfg.environment) return;
    updateCloverConfig({ environment: env });
    if (env === "production") {
      toast.warning("Production mode — live charges are now enabled.");
    } else {
      toast.success("Switched to Sandbox — no real charges.");
    }
  };

  const generateWebhookSecret = () => {
    const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
    updateCloverConfig({ webhookSecret: secret });
    setRevealedSecret(secret);
  };

  const runTestCharge = async () => {
    setCharging(true);
    setChargeResult(null);
    try {
      const result = await sendCloverTestCharge();
      setChargeResult(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setCharging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. API Credentials */}
      <SectionCard
        icon={KeyRound}
        title="Clover Fiserv API Credentials"
        description="Stored encrypted; masked after entry. Yipyy uses these to charge facilities."
      >
        {showForm ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="clover-merchant">Merchant ID</Label>
              <Input
                id="clover-merchant"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="merchant_xxxxx"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clover-secret">Private App Secret</Label>
              <Input
                id="clover-secret"
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clover-appid">App ID</Label>
              <Input
                id="clover-appid"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="APP-xxxxx"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <MaskedField
              label="Merchant ID"
              value={maskSecret(cfg.merchantId)}
            />
            <MaskedField
              label="Private App Secret"
              value={maskSecret(cfg.appSecret)}
            />
            <MaskedField label="App ID" value={maskSecret(cfg.appId)} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {showForm ? (
            <>
              <Button onClick={saveCredentials}>Save credentials</Button>
              {cfg.configured && (
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={startEdit}>
              Edit credentials
            </Button>
          )}
          <Button
            variant="ghost"
            className="gap-1.5"
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TestTube className="size-4" />
            )}
            Test Connection
          </Button>
          {connResult && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                connResult.ok ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {connResult.ok ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <XCircle className="size-3.5" />
              )}
              {connResult.message}
            </span>
          )}
        </div>
      </SectionCard>

      {/* 2. Environment */}
      <SectionCard
        icon={ShieldCheck}
        title="Environment"
        description="Sandbox uses Clover's test environment (no real charges). Production goes live."
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border p-1">
            {(["sandbox", "production"] as CloverEnvironment[]).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => setEnvironment(env)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  cfg.environment === env
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {env}
              </button>
            ))}
          </div>
          <Badge
            variant="outline"
            className={cn(
              cfg.environment === "production"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
            )}
          >
            {cfg.environment === "production"
              ? "Live — real charges"
              : "Sandbox — test only"}
          </Badge>
        </div>
      </SectionCard>

      {/* 3. Subscription Billing Config */}
      <SectionCard
        icon={Repeat}
        title="Subscription Billing"
        description="How Yipyy invoices and collects subscription payments from facilities."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default billing currency</Label>
            <Select
              value={cfg.currency}
              onValueChange={(v) => updateCloverConfig({ currency: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="divide-y rounded-lg border">
          <ToggleRow
            label="Invoice generation"
            hint="Auto-generate an invoice at the start of each billing cycle"
            checked={cfg.autoInvoice}
            onChange={(v) => updateCloverConfig({ autoInvoice: v })}
          />
          <ToggleRow
            label="Payment collection"
            hint="Auto-charge the card on file on the invoice due date"
            checked={cfg.autoCharge}
            onChange={(v) => updateCloverConfig({ autoCharge: v })}
          />
          <div className="flex items-center justify-between gap-4 p-3">
            <div>
              <p className="text-sm font-medium">Retry logic</p>
              <p className="text-muted-foreground text-xs">
                Retry failed payments on Day 1, Day 7 and Day 14 (matches the
                dunning sequence)
              </p>
            </div>
            <div className="flex gap-1.5">
              {RETRY_DAYS.map((d) => (
                <Badge key={d} variant="secondary" className="text-[10px]">
                  Day {d}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 4. Webhook Configuration */}
      <SectionCard
        icon={Webhook}
        title="Webhook Configuration"
        description="Clover posts payment events to this endpoint."
      >
        <div className="space-y-1.5">
          <Label>Webhook URL</Label>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-xs">
              {WEBHOOK_URL}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(WEBHOOK_URL, "Webhook URL")}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Events listened for</Label>
          <div className="flex flex-wrap gap-1.5">
            {WEBHOOK_EVENTS.map((e) => (
              <Badge
                key={e}
                variant="outline"
                className="font-mono text-[11px]"
              >
                {e}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Webhook signing secret</Label>
          {revealedSecret ? (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-950/30">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-3.5" />
                Shown once — copy it to your Clover dashboard now.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-white/70 px-3 py-2 font-mono text-xs dark:bg-black/30">
                  {revealedSecret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(revealedSecret, "Webhook secret")}
                >
                  <Copy className="size-3.5" />
                </Button>
                <Button size="sm" onClick={() => setRevealedSecret(null)}>
                  Done
                </Button>
              </div>
            </div>
          ) : cfg.webhookSecret ? (
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-xs">
                {maskSecret(cfg.webhookSecret)}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={generateWebhookSecret}
              >
                Regenerate
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={generateWebhookSecret}>
              Generate webhook secret
            </Button>
          )}
        </div>
      </SectionCard>

      {/* 5. Test Charge */}
      <SectionCard
        icon={TestTube}
        title="Test Charge"
        description="Verify the full charge → refund flow end-to-end."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runTestCharge}
            disabled={charging || !cfg.configured}
            className="gap-1.5"
          >
            {charging ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CreditCard className="size-4" />
            )}
            Send Test Charge of $0.01
          </Button>
          {!cfg.configured && (
            <span className="text-muted-foreground text-xs">
              Save credentials first.
            </span>
          )}
          {chargeResult?.ok && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              Charged {chargeResult.chargeId} · refunded {chargeResult.refundId}
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function MaskedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <code className="bg-muted block truncate rounded-md px-3 py-2 font-mono text-xs">
        {value || "—"}
      </code>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
