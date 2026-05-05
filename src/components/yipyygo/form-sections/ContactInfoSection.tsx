"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, User, Phone, Mail } from "lucide-react";
import { AdditionalContactsManager } from "@/components/clients/AdditionalContactsManager";
import type { AdditionalContact } from "@/types/client";
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  additionalContacts: AdditionalContact[];
};

type ContactInfoSectionProps = YipyyGoFormSectionProps;

export function ContactInfoSection({
  customer,
  onNext,
  onBack,
}: ContactInfoSectionProps) {
  const [values, setValues] = useState<ContactForm>(() => ({
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    additionalContacts: (customer.additionalContacts ??
      []) as AdditionalContact[],
  }));

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!values.name.trim()) list.push("Full name");
    if (!values.email.trim()) list.push("Email");
    if (!values.phone.trim()) list.push("Phone number");
    values.additionalContacts.forEach((contact, idx) => {
      if (!contact.name.trim()) {
        list.push(`Additional contact #${idx + 1} name`);
      }
      if (!contact.phone.trim()) {
        list.push(`Additional contact #${idx + 1} phone`);
      }
    });
    return list;
  }, [values]);

  const update = (updates: Partial<ContactForm>) =>
    setValues((v) => ({ ...v, ...updates }));

  const canContinue = missing.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="text-primary size-5" />
          Verify your contact info
        </CardTitle>
        <CardDescription>
          We prefilled this from your Yipyy account. Review and update anything
          that&apos;s out of date before continuing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {missing.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>
              Please fill in: <strong>{missing.join(", ")}</strong>. You
              can&apos;t continue until these are provided.
            </AlertDescription>
          </Alert>
        )}
        {missing.length === 0 && (
          <Alert>
            <CheckCircle2 className="size-4 text-green-600" />
            <AlertDescription>
              All required contact info is on file.{" "}
              <Link
                href="/customer/settings"
                className="text-primary underline"
              >
                Edit in account settings
              </Link>{" "}
              if needed.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Primary contact</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Full name</Label>
              <Input
                id="contact-name"
                value={values.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">
                <Phone className="mr-1 inline size-3" />
                Phone
              </Label>
              <Input
                id="contact-phone"
                value={values.phone}
                onChange={(e) => update({ phone: e.target.value })}
                placeholder="(514) 555-0123"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="contact-email">
                <Mail className="mr-1 inline size-3" />
                Email
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={values.email}
                onChange={(e) => update({ email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>

        <AdditionalContactsManager
          value={values.additionalContacts}
          onChange={(contacts) => update({ additionalContacts: contacts })}
          heading="Additional contacts"
          description="Add people who can be contacted for emergencies, pickup, or drop-off. Tag each contact with what they're authorized to do."
        />

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canContinue}>
            Next: Pet details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
