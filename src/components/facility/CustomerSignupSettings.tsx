"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// Whether people can sign themselves up as your customers.
//
// Spec 002 phase 5 built `allow_customer_signup` and defaulted it to FALSE,
// deliberately: a business that has not asked for public registration should
// not acquire it because we shipped a feature. The reverse default silently
// turns somebody's client list into an open form.
//
// The consequence was that nothing could turn it on, so /join refused
// everyone. This is the switch.
//
// ── OFF IS NOT A CLOSED DOOR FOR EXISTING CUSTOMERS ───────────────────────
//
// Worth saying on the screen, because the obvious reading of "off" is "nobody
// can get in", and that would be wrong in a way that costs a facility support
// calls. `register_client` CLAIMS a record the facility already created before
// it looks at this flag — somebody the front desk entered can always link
// their login to the record waiting for them. What the flag governs is
// STRANGERS creating new records.
// ============================================================================

interface Config {
  facilityName: string;
  slug: string | null;
  appDomain: string | null;
  allowCustomerSignup: boolean;
}

const KEY = ["facility", "customer-signup"] as const;

export function CustomerSignupSettings() {
  const t = useSettingsText().section("branding");
  const fill = (key: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      t(key),
    );
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Config> => {
      const response = await fetch("/api/facility/customer-signup");
      if (!response.ok) throw new Error("Could not load this setting.");
      return (await response.json()) as Config;
    },
  });

  const save = useMutation({
    mutationFn: async (next: boolean) => {
      const response = await fetch("/api/facility/customer-signup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowCustomerSignup: next }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error ?? t("saveFailed"));
      return body;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });

  const host =
    data?.slug && data.appDomain ? `${data.slug}.${data.appDomain}` : null;

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="size-4" />
          {t("signupTitle")}
        </CardTitle>
        <CardDescription>{t("signupHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <Label htmlFor="allow-customer-signup">
                  {t("signupToggle")}
                </Label>
                {/* One whole sentence per branch, filled here. The English
                    version wove the host into the middle of the sentence with
                    a <strong> — a shape French cannot reproduce, because the
                    address lands somewhere else in the clause. */}
                <p className="text-ink-tertiary text-[14.5px]">
                  {fill(host ? "signupAtAddress" : "signupAtOwnAddress", {
                    host: host ?? "",
                    facility: data?.facilityName ?? "",
                  })}
                </p>
              </div>
              <Switch
                id="allow-customer-signup"
                checked={data?.allowCustomerSignup ?? false}
                disabled={save.isPending}
                onCheckedChange={(next) => save.mutate(next)}
              />
            </div>

            <p className="text-ink-tertiary border-t pt-4 text-[13.5px]">
              {t("signupOffNote")}
            </p>
          </>
        )}

        {save.isError && (
          <p className="text-destructive text-sm" role="alert">
            {save.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
