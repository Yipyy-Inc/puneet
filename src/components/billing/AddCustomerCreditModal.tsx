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
import { clients } from "@/data/clients";

interface AddCustomerCreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  prefilledClient?: number;
  onSuccess?: (credit: any) => void;
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

  const facilityClients = clients.filter((c) => c.id >= 15);

  const handleSubmit = () => {
    if (!selectedClient) {
      alert("Please select a client");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    const credit = {
      id: `credit-${Date.now()}`,
      facilityId,
      clientId: selectedClient,
      amount,
      remainingAmount: amount,
      currency: "USD" as const,
      reason,
      status: "active" as const,
      description,
      neverExpires,
      expiryDate: !neverExpires ? expiryDate : undefined,
      createdAt: new Date().toISOString(),
      createdBy: "Current User",
      createdById: 1,
      notes: notes || undefined,
    };

    console.log("Customer credit added:", credit);

    if (onSuccess) {
      onSuccess(credit);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Add Customer Credit
          </DialogTitle>
          <DialogDescription>
            Add credit to a customer's account
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
            <Select value={reason} onValueChange={(v) => setReason(v as any)}>
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
              <div className="space-y-2 mt-2">
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
            <DollarSign className="h-4 w-4 mr-2" />
            Add Credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
