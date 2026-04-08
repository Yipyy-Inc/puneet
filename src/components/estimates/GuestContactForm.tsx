"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { User, Mail, Phone, PawPrint, Plus, Trash2 } from "lucide-react";

interface GuestContactFormProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  guestPetNames: string[];
  setGuestPetNames: React.Dispatch<React.SetStateAction<string[]>>;
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
  guestPetNames,
  setGuestPetNames,
  publicNote,
  setPublicNote,
  createAccount,
  setCreateAccount,
}: GuestContactFormProps) {
  const resolvedGuestPetNames =
    guestPetNames.length > 0 ? guestPetNames : [""];

  const handleGuestPetNameChange = (index: number, value: string) => {
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      names[index] = value;
      return names;
    });
  };

  const addGuestPetField = () => {
    setGuestPetNames((prev) => [...(prev.length > 0 ? prev : [""]), ""]);
  };

  const removeGuestPetField = (index: number) => {
    setGuestPetNames((prev) => {
      const names = prev.length > 0 ? [...prev] : [""];
      if (names.length <= 1) return names;
      const next = names.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">New Inquiry</h3>

      <div className="space-y-4 rounded-xl border bg-slate-50/40 p-4">
        <h4 className="text-base font-semibold">Contact Information</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <User className="size-3.5" /> Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="size-3.5" /> Email *
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="bg-white"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Phone className="size-3.5" /> Phone
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="bg-white"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border bg-violet-50/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="flex items-center gap-1.5 text-base font-semibold">
              <PawPrint className="size-4" /> Pet Information
            </h4>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Add one or more pets to include in this estimate.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={addGuestPetField}
          >
            <Plus className="size-3" />
            Add pet
          </Button>
        </div>

        <div className="space-y-2">
          {resolvedGuestPetNames.map((petName, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex h-8 min-w-8 items-center justify-center rounded-md bg-violet-100 text-xs font-semibold text-violet-700">
                {index + 1}
              </div>
              <Input
                value={petName}
                onChange={(e) =>
                  handleGuestPetNameChange(index, e.target.value)
                }
                placeholder={`Pet ${index + 1} name (optional)`}
                className="bg-white"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-400 hover:text-red-500"
                disabled={resolvedGuestPetNames.length <= 1}
                onClick={() => removeGuestPetField(index)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Remove pet</span>
              </Button>
            </div>
          ))}
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
