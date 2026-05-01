"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SettingsBlock } from "@/components/ui/settings-block";
import { Copy, CheckCircle2, XCircle, RefreshCw, Mail, Globe, AlertCircle, RefreshCcw } from "lucide-react";
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
    { type: "TXT", name: `moego._domainkey.${domain || "yourdomain.com"}`, value: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..." },
    { type: "TXT", name: domain || "yourdomain.com", value: "v=spf1 include:spf.moego.pet ~all" },
    { type: "CNAME", name: `email.${domain || "yourdomain.com"}`, value: "mail.moego.pet" },
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
                Send automated emails, campaigns, and reminders using your own business domain (e.g., info@examplefacility.com) instead of the default platform email.
                Replies from customers will go directly to your business inbox.
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
                Public email providers like Gmail, Yahoo, or Outlook are not supported for custom sender domains. You must own a custom business domain to use this feature.
              </AlertDescription>
            </Alert>

            {/* Step Progress */}
            <div className="flex justify-between relative border-b pb-8">
              {[
                { num: 1, title: "Settings", desc: "Enable Feature", active: step >= 1 },
                { num: 2, title: "Email", desc: "Verify Address", active: step >= 2 },
                { num: 3, title: "Domain", desc: "DNS Verification", active: step >= 3 },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center z-10 w-1/3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${s.active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                    {s.active && step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-sm font-semibold ${s.active ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">{s.desc}</span>
                </div>
              ))}
            </div>

            {/* Step 2: Verify Email */}
            {step === 1 && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sender Name</Label>
                    <Input 
                      placeholder="e.g. Doggieville MTL" 
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">The display name recipients will see.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Email Address</Label>
                    <Input 
                      placeholder="e.g. info@doggieville.com" 
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">The address emails will be sent from.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)} disabled={!domain || !senderName}>
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-6 text-center space-y-4 max-w-lg mx-auto">
                  <Mail className="w-12 h-12 text-blue-500 mx-auto" />
                  <h3 className="text-lg font-semibold">Verify Email Ownership</h3>
                  <p className="text-sm text-muted-foreground">
                    We will send a verification code to <strong>{domain}</strong> to confirm you own this address.
                  </p>
                  <Button onClick={handleVerifyEmail} className="w-full">
                    Send Verification Email
                  </Button>
                  <Button variant="ghost" onClick={() => setStep(1)} className="w-full text-muted-foreground">
                    Back to Settings
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: DNS Records */}
            {step === 3 && (
              <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Globe className="w-5 h-5" /> Domain Authentication
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add the following records to your domain's DNS settings (e.g. GoDaddy, Namecheap, Cloudflare) to verify the domain.
                    </p>
                  </div>
                  <Badge variant={domainStatus === "verified" ? "default" : domainStatus === "pending" ? "secondary" : "outline"} className="text-sm px-3 py-1">
                    {domainStatus === "verified" && <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" />}
                    {domainStatus === "pending" && <RefreshCw className="w-4 h-4 mr-1 animate-spin" />}
                    {domainStatus === "unverified" && <XCircle className="w-4 h-4 mr-1 text-red-500" />}
                    {domainStatus === "verified" ? "Verified" : domainStatus === "pending" ? "Checking..." : "Action Required"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {dnsRecords.map((record, i) => (
                    <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono bg-slate-50 dark:bg-slate-900 border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-300">
                          {record.type}
                        </Badge>
                        <span className="text-sm font-medium text-muted-foreground">Record Setup</span>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Host / Name</Label>
                          <div className="flex items-center">
                            <code className="text-sm flex-1 bg-muted p-2 rounded-l-md border border-r-0 truncate">
                              {record.name}
                            </code>
                            <Button variant="outline" size="icon" className="rounded-l-none border-l-0" onClick={() => handleCopy(record.name)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Value / Target</Label>
                          <div className="flex items-center">
                            <code className="text-sm flex-1 bg-muted p-2 rounded-l-md border border-r-0 truncate">
                              {record.value}
                            </code>
                            <Button variant="outline" size="icon" className="rounded-l-none border-l-0" onClick={() => handleCopy(record.value)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 p-4 rounded-lg flex items-start gap-3 mt-6">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-1">DNS Propagation</p>
                    <p>After adding these records in your registrar, it may take between 10 minutes to 48 hours for changes to propagate globally. You can click Verify repeatedly to check status.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                  <Button variant="outline" onClick={() => setStep(1)} className="text-muted-foreground">
                    Edit Details
                  </Button>
                  <Button 
                    onClick={handleVerifyDomain} 
                    disabled={domainStatus === "verified" || domainStatus === "pending"}
                    className="gap-2"
                  >
                     <RefreshCcw className="w-4 h-4" />
                     {domainStatus === "verified" ? "Domain Verified" : "Verify Domain Status"}
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
