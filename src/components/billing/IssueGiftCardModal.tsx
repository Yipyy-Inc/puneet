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
import { clients } from "@/data/clients";

interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: "purchase";
  amount: number;
  balanceAfter: number;
  timestamp: string;
}

interface GiftCard {
  id: string;
  facilityId: number;
  code: string;
  type: "online" | "physical";
  initialAmount: number;
  currentBalance: number;
  currency: "USD";
  status: "active";
  purchasedBy?: string;
  purchasedByClientId?: number;
  purchaseDate: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  neverExpires: boolean;
  expiryDate?: string;
  createdAt: string;
  transactionHistory: GiftCardTransaction[];
}

interface IssueGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  onSuccess?: (giftCard: GiftCard) => void;
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

  const facilityClients = clients.filter((c) => c.id >= 15);

  const generateCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GIFT-PAWS-${new Date().getFullYear()}-${timestamp}${random}`;
  };

  const handleSubmit = () => {
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const giftCard = {
      id: `gc-${Date.now()}`,
      facilityId,
      code: generateCode(),
      type,
      initialAmount: amount,
      currentBalance: amount,
      currency: "USD" as const,
      status: "active" as const,
      purchasedBy: purchasedByClientId
        ? clients.find((c) => c.id === purchasedByClientId)?.name
        : undefined,
      purchasedByClientId: purchasedByClientId || undefined,
      purchaseDate: new Date().toISOString().split("T")[0],
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
      neverExpires,
      expiryDate: !neverExpires ? expiryDate : undefined,
      createdAt: new Date().toISOString(),
      transactionHistory: [
        {
          id: `gct-${Date.now()}`,
          giftCardId: `gc-${Date.now()}`,
          type: "purchase" as const,
          amount,
          balanceAfter: amount,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    console.log("Gift card issued:", giftCard);

    if (onSuccess) {
      onSuccess(giftCard);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
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
                <p className="text-sm text-muted-foreground mb-1">
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
            <Gift className="h-4 w-4 mr-2" />
            Issue Gift Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
