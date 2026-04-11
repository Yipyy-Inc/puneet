"use client";

import { use, useState } from "react";
import { clients } from "@/data/clients";
import { clientCommunications } from "@/data/communications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Mail, Phone, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSettings } from "@/hooks/use-settings";
import { getCustomerLanguageLabel } from "@/lib/language-settings";

export default function ClientMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { languageSettings } = useSettings();
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  const [quickMsg, setQuickMsg] = useState("");
  const [now] = useState(() => Date.now());

  if (!client) return null;

  const preferredLanguageLabel = client.preferredLanguage
    ? getCustomerLanguageLabel(client.preferredLanguage)
    : null;
  const canCommunicateInPreferredLanguage =
    !!client.preferredLanguage &&
    languageSettings.customerLanguagePreferenceEnabled &&
    languageSettings.customerSupportedLanguages.includes(
      client.preferredLanguage,
    );

  const messages = clientCommunications
    .filter((c) => c.clientId === clientId)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  const timeAgo = (ts: string) => {
    const diff = now - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 30) return `${Math.floor(days / 30)}mo ago`;
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs}h ago`;
    return "Just now";
  };

  const channelIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="size-3" />;
      case "sms":
        return <Phone className="size-3" />;
      default:
        return <MessageSquare className="size-3" />;
    }
  };

  const channelColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "sms":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-violet-100 text-violet-700 border-violet-200";
    }
  };

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Messages</h2>

      {/* Quick send */}
      {preferredLanguageLabel && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900">
          <Badge
            variant="outline"
            className="h-5 border-indigo-200 bg-white text-[10px] font-semibold text-indigo-700"
          >
            {preferredLanguageLabel}
          </Badge>
          <span>
            {canCommunicateInPreferredLanguage
              ? `Preferred language enabled. Use ${preferredLanguageLabel} for customer communication when possible.`
              : `Preferred language is ${preferredLanguageLabel}. Enable this language in facility settings to support multilingual communication.`}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={quickMsg}
          onChange={(e) => setQuickMsg(e.target.value)}
          placeholder={
            canCommunicateInPreferredLanguage
              ? `Message ${client.name} in ${preferredLanguageLabel}...`
              : `Message ${client.name}...`
          }
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && quickMsg.trim()) {
              toast.success(
                canCommunicateInPreferredLanguage
                  ? `Message sent to ${client.name} (${preferredLanguageLabel})`
                  : `Message sent to ${client.name}`,
              );
              setQuickMsg("");
            }
          }}
        />
        <Button
          onClick={() => {
            if (quickMsg.trim()) {
              toast.success(
                canCommunicateInPreferredLanguage
                  ? `Message sent to ${client.name} (${preferredLanguageLabel})`
                  : `Message sent to ${client.name}`,
              );
              setQuickMsg("");
            }
          }}
          disabled={!quickMsg.trim()}
          className="gap-1.5"
        >
          <Send className="size-4" />
          Send
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="size-4" />
            History ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No messages
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="hover:bg-muted/30 flex items-start gap-3 rounded-md border px-3 py-2.5 transition-colors"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                      channelColor(msg.type),
                    )}
                  >
                    {channelIcon(msg.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {msg.subject || msg.type.toUpperCase()}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] capitalize"
                      >
                        {msg.direction}
                      </Badge>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {timeAgo(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
