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
import type { YipyyGoFormSectionProps } from "@/types/yipyygo";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
  emergencyEmail: string;
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
    emergencyName: customer.emergencyContact?.name ?? "",
    emergencyRelationship: customer.emergencyContact?.relationship ?? "",
    emergencyPhone: customer.emergencyContact?.phone ?? "",
    emergencyEmail: customer.emergencyContact?.email ?? "",
  }));

  const missing = useMemo(() => {
    const list: string[] = [];
    if (!values.name.trim()) list.push("Full name");
    if (!values.email.trim()) list.push("Email");
    if (!values.phone.trim()) list.push("Phone number");
    if (!values.emergencyName.trim()) list.push("Emergency contact name");
    if (!values.emergencyPhone.trim()) list.push("Emergency contact phone");
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

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Emergency contact</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emergency-name">Name</Label>
              <Input
                id="emergency-name"
                value={values.emergencyName}
                onChange={(e) => update({ emergencyName: e.target.value })}
                placeholder="Emergency contact name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency-relationship">Relationship</Label>
              <Input
                id="emergency-relationship"
                value={values.emergencyRelationship}
                onChange={(e) =>
                  update({ emergencyRelationship: e.target.value })
                }
                placeholder="e.g., Spouse, Sibling, Friend"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency-phone">Phone</Label>
              <Input
                id="emergency-phone"
                value={values.emergencyPhone}
                onChange={(e) => update({ emergencyPhone: e.target.value })}
                placeholder="(514) 555-0123"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency-email">Email (optional)</Label>
              <Input
                id="emergency-email"
                type="email"
                value={values.emergencyEmail}
                onChange={(e) => update({ emergencyEmail: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
          </div>
        </div>

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
