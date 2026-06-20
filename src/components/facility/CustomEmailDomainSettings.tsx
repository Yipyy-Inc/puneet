"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Mail,
  Globe,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

type DomainStatus = "unverified" | "pending" | "verified";

interface DnsRecord {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
}

export function CustomEmailDomainSettings() {
  const [enabled, setEnabled] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [domain, setDomain] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [emailVerified, setEmailVerified] = useState(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>("unverified");

  const dnsRecords: DnsRecord[] = [
    {
      type: "TXT",
      name: `moego._domainkey.${domain || "yourdomain.com"}`,
      value:
        "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
    },
    {
      type: "TXT",
      name: domain || "yourdomain.com",
      value: "v=spf1 include:spf.moego.pet ~all",
    },
    {
      type: "CNAME",
      name: `email.${domain || "yourdomain.com"}`,
      value: "mail.moego.pet",
    },
  ];

  const handleVerifyEmail = () => {
    toast.success("Verification Email Sent", {
      description: `A verification code has been sent to ${domain}. Please check your inbox.`,
    });
    setTimeout(() => {
      setEmailVerified(true);
      setStep(3);
    }, 1500);
  };

  const handleVerifyDomain = () => {
    setDomainStatus("pending");
    toast("Checking DNS Records", {
      description: "Verifying your DNS configuration. This may take a moment.",
    });
    setTimeout(() => {
      setDomainStatus("verified");
      toast.success("Domain Verified!", {
        description: "Your custom email domain is now active.",
      });
    }, 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Custom Email Domain
              </CardTitle>
              <CardDescription>
                Send automated emails, campaigns, and reminders using your own
                business domain (e.g., info@examplefacility.com) instead of the
                default platform email. Replies from customers will go directly
                to your business inbox.
              </CardDescription>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-8">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Public email providers like Gmail, Yahoo, or Outlook are not
                supported for custom sender domains. You must own a custom
                business domain to use this feature.
              </AlertDescription>
            </Alert>

            {/* Step Progress */}
            <div className="relative flex justify-between border-b pb-8">
              {[
                {
                  num: 1,
                  title: "Settings",
                  desc: "Enable Feature",
                  active: step >= 1,
                },
                {
                  num: 2,
                  title: "Email",
                  desc: "Verify Address",
                  active: step >= 2,
                },
                {
                  num: 3,
                  title: "Domain",
                  desc: "DNS Verification",
                  active: step >= 3,
                },
              ].map((s, i) => (
                <div key={i} className="z-10 flex w-1/3 flex-col items-center">
                  <div
                    className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${s.active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}
                  >
                    {s.active && step > s.num ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      s.num
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold ${s.active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {s.title}
                  </span>
                  <span className="text-muted-foreground mt-1 text-center text-xs">
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 2: Verify Email */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sender Name</Label>
                    <Input
                      placeholder="e.g. Doggieville MTL"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">
                      The display name recipients will see.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Email Address</Label>
                    <Input
                      placeholder="e.g. info@doggieville.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">
                      The address emails will be sent from.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!domain || !senderName}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4 pt-4">
                <div className="mx-auto max-w-lg space-y-4 rounded-lg border bg-slate-50 p-6 text-center dark:bg-slate-900">
                  <Mail className="mx-auto h-12 w-12 text-blue-500" />
                  <h3 className="text-lg font-semibold">
                    Verify Email Ownership
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    We will send a verification code to{" "}
                    <strong>{domain}</strong> to confirm you own this address.
                  </p>
                  <Button onClick={handleVerifyEmail} className="w-full">
                    Send Verification Email
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-muted-foreground w-full"
                  >
                    Back to Settings
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: DNS Records */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Globe className="h-5 w-5" /> Domain Authentication
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Add the following records to your domain&#39;s DNS
                      settings (e.g. GoDaddy, Namecheap, Cloudflare) to verify
                      the domain.
                    </p>
                  </div>
                  <Badge
                    variant={
                      domainStatus === "verified"
                        ? "default"
                        : domainStatus === "pending"
                          ? "secondary"
                          : "outline"
                    }
                    className="px-3 py-1 text-sm"
                  >
                    {domainStatus === "verified" && (
                      <CheckCircle2 className="mr-1 h-4 w-4 text-emerald-500" />
                    )}
                    {domainStatus === "pending" && (
                      <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    {domainStatus === "unverified" && (
                      <XCircle className="mr-1 h-4 w-4 text-red-500" />
                    )}
                    {domainStatus === "verified"
                      ? "Verified"
                      : domainStatus === "pending"
                        ? "Checking..."
                        : "Action Required"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {dnsRecords.map((record, i) => (
                    <div
                      key={i}
                      className="bg-card space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-slate-50 font-mono text-blue-700 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300"
                        >
                          {record.type}
                        </Badge>
                        <span className="text-muted-foreground text-sm font-medium">
                          Record Setup
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Host / Name
                          </Label>
                          <div className="flex items-center">
                            <code className="bg-muted flex-1 truncate rounded-l-md border border-r-0 p-2 text-sm">
                              {record.name}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-l-none border-l-0"
                              onClick={() => handleCopy(record.name)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Value / Target
                          </Label>
                          <div className="flex items-center">
                            <code className="bg-muted flex-1 truncate rounded-l-md border border-r-0 p-2 text-sm">
                              {record.value}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-l-none border-l-0"
                              onClick={() => handleCopy(record.value)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-900/10">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="mb-1 font-semibold">DNS Propagation</p>
                    <p>
                      After adding these records in your registrar, it may take
                      between 10 minutes to 48 hours for changes to propagate
                      globally. You can click Verify repeatedly to check status.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="text-muted-foreground"
                  >
                    Edit Details
                  </Button>
                  <Button
                    onClick={handleVerifyDomain}
                    disabled={
                      domainStatus === "verified" || domainStatus === "pending"
                    }
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {domainStatus === "verified"
                      ? "Domain Verified"
                      : "Verify Domain Status"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
