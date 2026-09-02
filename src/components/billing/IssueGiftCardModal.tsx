"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientQueries } from "@/lib/api/client";
import { useIssueGiftCard } from "@/lib/api/gift-cards";

interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: "purchase";
  amount: number;
  balanceAfter: number;
  timestamp: string;
}

interface IssueGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  /**
   * Told that a card was issued, and nothing more. It used to receive the
   * object this modal invented, which the billing page turned into "Gift card
   * … issued successfully!" over a `console.log`.
   */
  onSuccess?: () => void;
}

export function IssueGiftCardModal({
  open,
  onOpenChange,
  facilityId,
  onSuccess,
}: IssueGiftCardModalProps) {
  const [type, setType] = useState<"online" | "physical">("online");
  const [amount, setAmount] = useState(0);
  const [purchasedByClientId, setPurchasedByClientId] = useState(0);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [neverExpires, setNeverExpires] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");

  // ── THE PICKER AND THE CARD WERE BOTH INVENTED ─────────────────────────
  //
  // The list was `clients.filter((c) => c.id >= 15)` from src/data — twenty
  // people, six of whom (23-27, 30) are in no database — and `handleSubmit`
  // built a card object, `console.log`ed it and closed, while the billing page
  // alerted "Gift card … issued successfully!". A customer could pay for a card
  // and be handed a code that existed nowhere: the liability the gift_cards
  // table exists to record simply was not recorded.
  //
  // `generateCode` went with it. The DATABASE issues the code, in the same
  // transaction as the card and its opening ledger entry — a code minted here
  // would be one the row does not have.
  const { data: roster } = useQuery(clientQueries.all());
  const facilityClients = roster ?? [];
  const issueGiftCard = useIssueGiftCard();

  const handleSubmit = async () => {
    if (amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    try {
      const card = await issueGiftCard.mutateAsync({
        amount,
        kind: type === "physical" ? "physical" : "online",
        purchasedByClientRef: purchasedByClientId || undefined,
        recipientName: recipientName || undefined,
        recipientEmail: recipientEmail || undefined,
        message: message || undefined,
        expiresAt: !neverExpires && expiryDate ? expiryDate : undefined,
      });
      // The code comes back from the database, so this is the one the customer
      // can actually present. Reading it off a locally generated string was how
      // a card and its code could disagree.
      toast.success(`Gift card ${card.code} issued.`, {
        description: `$${amount.toFixed(2)} is now recorded against this facility.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not issue that card.", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            Issue Gift Card
          </DialogTitle>
          <DialogDescription>Create a new gift card</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "online" | "physical")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online / Digital</SelectItem>
                  <SelectItem value="physical">Physical Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="100.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaser">Purchased By (Optional)</Label>
            <Select
              value={purchasedByClientId.toString()}
              onValueChange={(value) => setPurchasedByClientId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                {facilityClients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Recipient Name (Optional)</Label>
              <Input
                id="recipient-name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">
                Recipient Email (Optional)
              </Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Gift Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Happy Birthday! Enjoy..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="never-expires"
                checked={neverExpires}
                onCheckedChange={(checked) => setNeverExpires(!!checked)}
              />
              <Label htmlFor="never-expires">Never Expires</Label>
            </div>
            {!neverExpires && (
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expiry Date</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}
          </div>

          <Card className="border-2 bg-green-50">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-1 text-sm">
                  Gift Card Value
                </p>
                <p className="text-3xl font-bold text-green-600">
                  ${amount.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Gift className="mr-2 size-4" />
            Issue Gift Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
