"use client";

import { useState } from "react";

import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setSlack,
  useNotificationSettings,
} from "@/lib/notification-settings-store";

type TestResponse = {
  sent: boolean;
  reason?: string;
  message?: string;
};

export function NotificationSlackCard() {
  const settings = useNotificationSettings();
  const [url, setUrl] = useState(settings.slackWebhookUrl);
  const [channel, setChannel] = useState(settings.slackChannel);
  const [testing, setTesting] = useState(false);

  const save = () => {
    setSlack(url.trim(), channel.trim());
    toast.success("Slack settings saved");
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/notifications/slack-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url.trim() }),
      });
      const data = (await res.json()) as TestResponse;
      if (data.sent) {
        toast.success(data.message ?? "Test message sent to Slack");
      } else {
        toast.error(data.message ?? "Test failed");
      }
    } catch {
      toast.error("Could not reach the test endpoint");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="size-5" />
          Slack Integration
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Post alerts to a Slack channel via an incoming webhook.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1.5">
          <Label htmlFor="slack-url">Webhook URL</Label>
          <Input
            id="slack-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/T000/B000/XXXXXXXX"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="slack-channel">Channel</Label>
          <Input
            id="slack-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="#alerts"
            className="max-w-xs"
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Test performs a real POST to the webhook (falling back to the{" "}
          <code className="font-mono">SLACK_WEBHOOK_URL</code> env var). If
          neither is configured you&rsquo;ll get an honest &ldquo;not
          configured&rdquo; result rather than a fake success.
        </p>
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={save}
          >
            Save
          </Button>
          <Button variant="outline" onClick={test} disabled={testing}>
            {testing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
