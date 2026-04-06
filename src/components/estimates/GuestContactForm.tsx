"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Mail, Phone, PawPrint } from "lucide-react";

interface GuestContactFormProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  petName: string;
  setPetName: (v: string) => void;
  petBreed: string;
  setPetBreed: (v: string) => void;
  publicNote: string;
  setPublicNote: (v: string) => void;
  createAccount: boolean;
  setCreateAccount: (v: boolean) => void;
}

export function GuestContactForm({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  petName,
  setPetName,
  petBreed,
  setPetBreed,
  publicNote,
  setPublicNote,
  createAccount,
  setCreateAccount,
}: GuestContactFormProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <UserPlus className="size-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold">Customer Details</h3>
          <p className="text-muted-foreground text-sm">
            Enter the customer&apos;s contact info to send the estimate.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <UserPlus className="size-3.5" />
            Full Name *
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Mail className="size-3.5" />
            Email *
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            Phone (optional)
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      {/* Quick pet info */}
      <div className="rounded-xl border bg-slate-50/50 p-4">
        <Label className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <PawPrint className="size-3.5" />
          Pet Info (optional)
        </Label>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Pet's name (e.g., Max)"
            className="bg-white"
          />
          <Input
            value={petBreed}
            onChange={(e) => setPetBreed(e.target.value)}
            placeholder="Breed (e.g., Golden Retriever)"
            className="bg-white"
          />
        </div>
      </div>

      {/* Public note */}
      <div className="space-y-2">
        <Label>Note for Customer (optional)</Label>
        <Textarea
          value={publicNote}
          onChange={(e) => setPublicNote(e.target.value)}
          placeholder="Add a personal message that will be included with the estimate..."
          rows={3}
          className="min-h-[80px] resize-y text-sm/relaxed"
        />
      </div>

      {/* Auto-create account */}
      <div className="flex items-start gap-3 rounded-xl border bg-blue-50/50 p-4">
        <Switch
          checked={createAccount}
          onCheckedChange={setCreateAccount}
          className="mt-0.5"
        />
        <div>
          <p className="text-sm font-medium">
            Create customer account with this email
          </p>
          <p className="text-muted-foreground text-xs">
            A new account will be created so the customer can view the estimate,
            complete their profile, and book directly.
          </p>
        </div>
      </div>
    </div>
  );
}
