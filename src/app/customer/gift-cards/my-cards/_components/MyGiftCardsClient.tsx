"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gift,
  Send,
  Wallet,
  CheckCircle2,
  Loader2,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards } from "@/data/gift-cards";
import { clients } from "@/data/clients";
import type { GiftCard } from "@/types/payments";

const STATUS_META: Record<
  GiftCard["status"],
  { label: string; className: string }
> = {
  active: { label: "Active", className: "bg-green-500 text-white" },
  redeemed: { label: "Fully Redeemed", className: "bg-blue-500 text-white" },
  expired: { label: "Expired", className: "bg-red-500 text-white" },
  cancelled: { label: "Voided", className: "bg-gray-500 text-white" },
};

// Cards carry no design field yet, so derive a stable thumbnail gradient by id.
const THUMB_GRADIENTS = [
  "from-pink-400 to-rose-500",
  "from-violet-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-fuchsia-500 to-pink-600",
];
const thumbGradient = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h + ch.charCodeAt(0)) % THUMB_GRADIENTS.length;
  return THUMB_GRADIENTS[h];
};

const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

function Thumb({ id }: { id: string }) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm",
        thumbGradient(id),
      )}
    >
      <Gift className="size-5" />
    </div>
  );
}

interface MyGiftCardsClientProps {
  facilityId: number;
  customerId: number;
}

export function MyGiftCardsClient({
  facilityId,
  customerId,
}: MyGiftCardsClientProps) {
  const customer = clients.find((c) => c.id === customerId);
  const customerEmail = customer?.email.toLowerCase() ?? "";

  const sent = giftCards.filter(
    (gc) =>
      gc.facilityId === facilityId && gc.purchasedByClientId === customerId,
  );
  const received = giftCards.filter(
    (gc) =>
      gc.facilityId === facilityId &&
      gc.recipientEmail?.toLowerCase() === customerEmail,
  );

  const [resentIds, setResentIds] = useState<Set<string>>(new Set());
  const [loadCard, setLoadCard] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const closeLoad = () => {
    if (loading) return;
    setLoadCard(null);
    setLoadDone(false);
  };

  const handleLoad = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setLoadDone(true);
  };

  return (
    <>
      <Tabs defaultValue="sent">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent" className="gap-1.5">
            <Send className="size-4" />
            Cards I Sent
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-1.5">
            <Inbox className="size-4" />
            Cards I Received
          </TabsTrigger>
        </TabsList>

        {/* Cards I Sent */}
        <TabsContent value="sent" className="mt-4 space-y-2">
          {sent.length === 0 ? (
            <EmptyState
              icon={<Send className="size-6" />}
              text="You haven't sent any gift cards yet."
            />
          ) : (
            sent.map((gc) => (
              <div
                key={gc.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <Thumb id={gc.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    To {gc.recipientName ?? gc.recipientEmail ?? "Recipient"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                    Sent {fmtDate(gc.purchaseDate)}
                    <Badge
                      className={cn(
                        "text-[10px]",
                        STATUS_META[gc.status].className,
                      )}
                    >
                      {STATUS_META[gc.status].label}
                    </Badge>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    ${gc.initialAmount.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    ${gc.currentBalance.toFixed(2)} left
                  </p>
                </div>
                {gc.type === "online" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={resentIds.has(gc.id)}
                    onClick={() =>
                      setResentIds((prev) => new Set(prev).add(gc.id))
                    }
                  >
                    {resentIds.has(gc.id) ? (
                      <>
                        <CheckCircle2 className="size-3.5" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        Resend
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>

        {/* Cards I Received */}
        <TabsContent value="received" className="mt-4 space-y-2">
          {received.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-6" />}
              text="No gift cards have been sent to you yet."
            />
          ) : (
            received.map((gc) => {
              const canLoad = gc.status === "active" && gc.currentBalance > 0;
              return (
                <div
                  key={gc.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <Thumb id={gc.id} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      From {gc.purchasedBy ?? "Someone"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Received {fmtDate(gc.createdAt ?? gc.purchaseDate)} ·{" "}
                      {gc.neverExpires
                        ? "No expiry"
                        : `Expires ${fmtDate(gc.expiryDate)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-green-600">
                      ${gc.currentBalance.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      of ${gc.initialAmount.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={!canLoad}
                    onClick={() => {
                      setLoadDone(false);
                      setLoadCard(gc);
                    }}
                  >
                    <Wallet className="size-3.5" />
                    Load
                  </Button>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Load to My Wallet — simplified redeem flow */}
      <Dialog open={loadCard !== null} onOpenChange={(v) => !v && closeLoad()}>
        <DialogContent className="max-w-sm">
          {loadCard && !loadDone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="size-5" />
                  Load to My Wallet
                </DialogTitle>
                <DialogDescription>
                  Move this gift card&apos;s balance into your wallet to use on
                  any service.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Thumb id={loadCard.id} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    From {loadCard.purchasedBy ?? "Someone"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {loadCard.code}
                  </p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ${loadCard.currentBalance.toFixed(2)}
                </p>
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <ArrowUpRight className="size-4" />
                <span className="text-foreground font-semibold">
                  ${loadCard.currentBalance.toFixed(2)}
                </span>
                will be added to your wallet.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={closeLoad}>
                  Cancel
                </Button>
                <Button onClick={handleLoad} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Load to Wallet"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
          {loadCard && loadDone && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">Added to your wallet!</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  <span className="font-medium text-green-600">
                    ${loadCard.currentBalance.toFixed(2)}
                  </span>{" "}
                  is now available to spend on any service.
                </p>
              </div>
              <Button className="w-full" onClick={closeLoad}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        {icon}
      </div>
      {text}
    </div>
  );
}
