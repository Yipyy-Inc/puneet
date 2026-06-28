"use client";

import { useState } from "react";

import { Bell, CheckCircle2, Loader2, Mail, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChannelResult {
  sent: boolean;
  reason?: string;
}

interface SubscribeResponse {
  subscribed: boolean;
  email: ChannelResult | null;
  sms: ChannelResult | null;
  message: string;
}

function channelNote(
  label: string,
  result: ChannelResult | null,
): string | null {
  if (!result) return null;
  if (result.sent) return `${label}: confirmation sent.`;
  if (result.reason === "not_configured")
    return `${label}: subscription saved — confirmation delivery isn't enabled on this environment yet.`;
  return `${label}: subscription saved, but the confirmation could not be sent right now.`;
}

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubscribeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = (email.trim() !== "" || phone.trim() !== "") && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/status/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const json = (await res.json()) as SubscribeResponse & { error?: string };
      if (!res.ok) {
        setError(json?.error ?? "Something went wrong. Please try again.");
      } else {
        setResult(json);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const notes = result
    ? [
        channelNote("Email", result.email),
        channelNote("SMS", result.sms),
      ].filter((n): n is string => n !== null)
    : [];

  return (
    <section className="rounded-xl border p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Bell className="size-5" />
        Subscribe to Status Updates
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Get notified by email or SMS when an incident is opened, updated, or
        resolved.
      </p>

      {result ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/30">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
            {result.message}
          </p>
          {notes.length > 0 && (
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="status-email"
                className="flex items-center gap-1.5"
              >
                <Mail className="size-3.5" />
                Email
              </Label>
              <Input
                id="status-email"
                type="email"
                inputMode="email"
                placeholder="you@facility.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="status-phone"
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="size-3.5" />
                Mobile (SMS)
              </Label>
              <Input
                id="status-phone"
                type="tel"
                inputMode="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={!canSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Subscribe
            </Button>
            <span className="text-muted-foreground text-xs">
              Enter an email, a mobile number, or both.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
