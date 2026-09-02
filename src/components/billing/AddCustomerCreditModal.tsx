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
import { DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientQueries } from "@/lib/api/client";
import { useWriteStoreCredit } from "@/lib/api/store-credit";

interface AddCustomerCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  prefilledClient?: number;
  /**
   * Told that an entry landed, and nothing more. It used to receive the object
   * this modal invented, which the billing page turned into "Credit of $X added
   * successfully!" over a `console.log`.
   */
  onSuccess?: () => void;
}

export function AddCustomerCreditModal({
  open,
  onOpenChange,
  facilityId,
  prefilledClient,
  onSuccess,
}: AddCustomerCreditModalProps) {
  const [selectedClient, setSelectedClient] = useState(prefilledClient || 0);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState<
    "refund" | "promotion" | "compensation" | "prepaid" | "other"
  >("promotion");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [neverExpires, setNeverExpires] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");

  // ── THE PICKER AND THE WRITE WERE BOTH FICTION ─────────────────────────
  //
  // This listed `clients.filter((c) => c.id >= 15)` from src/data — twenty
  // people, six of whom (23-27, 30) do not exist in Postgres — and `handleSubmit`
  // built a credit object, `console.log`ed it, and closed. The billing page then
  // alerted "Credit of $X added successfully!".
  //
  // So a counter could add credit to a customer who does not exist, be told it
  // worked, and leave nothing behind. `store_credit_entries` is where credit
  // actually lives — the same ledger `record_payment` spends from at checkout.
  const { data: roster } = useQuery(clientQueries.all());
  const facilityClients = roster ?? [];
  const writeStoreCredit = useWriteStoreCredit();

  const handleSubmit = async () => {
    if (!selectedClient) {
      toast.error("Please select a client.");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }

    // `added` issues credit and the route requires `process_refund` for it —
    // giving money away and taking it back are different rights, and the policy
    // says so rather than this modal. A positive amount is the only shape
    // `added` allows (store_credit_sign_matches_reason).
    try {
      await writeStoreCredit.mutateAsync({
        clientRef: selectedClient,
        amount,
        reason: "added",
        note: notes ? `${description} — ${notes}` : description,
      });
      toast.success(`${amount.toFixed(2)} is on the customer's account.`, {
        description: "Spendable at the till from now.",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // The counter has to know it did NOT happen. The old version could not
      // fail, because it never asked anybody.
      toast.error("Could not add that credit.", {
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
            <DollarSign className="size-5" />
            Add Customer Credit
          </DialogTitle>
          <DialogDescription>
            Add credit to a customer&apos;s account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedClient.toString()}
                onValueChange={(value) => setSelectedClient(parseInt(value))}
                disabled={!!prefilledClient}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {facilityClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
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
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select
              value={reason}
              onValueChange={(v) =>
                setReason(
                  v as
                    | "refund"
                    | "promotion"
                    | "compensation"
                    | "prepaid"
                    | "other",
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promotion">
                  Promotion / Welcome Bonus
                </SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
                <SelectItem value="prepaid">Prepaid / Deposit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Welcome bonus for new customer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
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
              <div className="mt-2 space-y-2">
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
                  Credit Amount
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
            <DollarSign className="mr-2 size-4" />
            Add Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
