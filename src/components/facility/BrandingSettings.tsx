"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClerkSupabaseClient } from "@/lib/supabase/clerk-client";

// ============================================================================
// What a facility's customers see before they have signed in.
//
// Spec 002 phase 3.3. Phase 3 built the branded login page and the storage it
// reads from; without this screen an owner has no way to put anything in it, so
// every facility's page could only ever show its name in plain text.
//
// ── THE PREVIEW IS THE POINT ──────────────────────────────────────────────
//
// A colour picker with no preview asks someone to imagine a login page. The
// preview here is deliberately built from the same pieces as AuthCard, so what
// they approve is what their customers get — and a logo that is too dark, or a
// tagline that wraps badly, is visible before it is saved rather than after.
//
// ── THE UPLOAD GOES STRAIGHT TO STORAGE ───────────────────────────────────
//
// Through the browser's Clerk-bound Supabase client, so the SAME RLS decides
// it: the path must begin with a facility this person holds `settings_general`
// on, and Storage enforces the 2 MB cap and the png/jpeg/webp allow-list
// server-side. The URL is then saved through /api/facility/branding, which
// re-derives the facility from the session — so the file and the row it lands
// on are both scoped to the caller, by two independent checks.
// ============================================================================

interface Branding {
  facilityId: string;
  facilityName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  tagline: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
}

const BRANDING_KEY = ["facility", "branding"] as const;

export function BrandingSettings() {
  const queryClient = useQueryClient();
  const supabase = useClerkSupabaseClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Partial<Branding>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: BRANDING_KEY,
    queryFn: async (): Promise<Branding> => {
      const response = await fetch("/api/facility/branding");
      if (!response.ok) throw new Error("Could not load your branding.");
      return (await response.json()) as Branding;
    },
  });

  // The draft wins where it has been touched; everything else is what is
  // stored. Editing one field must not silently revert the others.
  const value = <K extends keyof Branding>(key: K): Branding[K] | null =>
    (draft[key] ?? data?.[key] ?? null) as Branding[K] | null;

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/facility/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: value("logoUrl") ?? "",
          wordmarkUrl: "",
          primaryColor: value("primaryColor") ?? "",
          accentColor: value("accentColor") ?? "",
          tagline: value("tagline") ?? "",
          supportEmail: value("supportEmail") ?? "",
          supportPhone: value("supportPhone") ?? "",
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) throw new Error(body?.error ?? "Could not save.");
      return body;
    },
    onSuccess: () => {
      setDraft({});
      void queryClient.invalidateQueries({ queryKey: BRANDING_KEY });
    },
  });

  async function onPickLogo(file: File) {
    setUploadError(null);
    if (!data?.facilityId) return;

    // Checked here for a fast, clear message. Storage checks both again on its
    // side, which is the enforcement — this is only so the person is not told
    // "row-level security" when they picked a 5 MB TIFF.
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("That file is over 2 MB. Try a smaller logo.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError("Use a PNG, JPEG or WebP image.");
      return;
    }

    // {facility_id}/... — the first segment IS the tenancy boundary the storage
    // policies key on, so this is not merely tidy.
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${data.facilityId}/logo-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("facility-logos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      setUploadError(error.message);
      return;
    }

    const { data: published } = supabase.storage
      .from("facility-logos")
      .getPublicUrl(path);

    setDraft((previous) => ({ ...previous, logoUrl: published.publicUrl }));
  }

  const dirty = Object.keys(draft).length > 0;
  const primary = value("primaryColor") ?? "#7C3AED";

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Your login page
          </CardTitle>
          <CardDescription>
            This is what your customers and staff see at your own web address,
            before they sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-2">
              {/* ── The controls ───────────────────────────────────────── */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInput.current?.click()}
                    >
                      <Upload className="mr-2 size-4" />
                      {value("logoUrl") ? "Replace logo" : "Upload logo"}
                    </Button>
                    {value("logoUrl") && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setDraft((p) => ({ ...p, logoUrl: null }))
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onPickLogo(file);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-muted-foreground text-xs">
                    PNG, JPEG or WebP, up to 2 MB. No logo is fine — your name
                    is shown instead.
                  </p>
                  {uploadError && (
                    <p className="text-destructive text-sm" role="alert">
                      {uploadError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branding-primary">Brand colour</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="branding-primary"
                      type="color"
                      value={primary}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          primaryColor: e.target.value.toUpperCase(),
                        }))
                      }
                      className="border-input h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
                    />
                    <Input
                      value={primary}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          primaryColor: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-32 font-mono"
                      aria-label="Brand colour hex value"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branding-tagline">Tagline</Label>
                  <Input
                    id="branding-tagline"
                    value={value("tagline") ?? ""}
                    maxLength={120}
                    placeholder="Boarding, daycare and grooming since 2014"
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, tagline: e.target.value }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Shown under your name on the sign-in card.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="branding-email">Support email</Label>
                    <Input
                      id="branding-email"
                      type="email"
                      value={value("supportEmail") ?? ""}
                      placeholder="hello@yourfacility.com"
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          supportEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branding-phone">Support phone</Label>
                    <Input
                      id="branding-phone"
                      value={value("supportPhone") ?? ""}
                      placeholder="(555) 123-4567"
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          supportPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Support details are for your signed-in screens. They are not
                  published on the login page.
                </p>
              </div>

              {/* ── The preview ────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="bg-muted/40 flex items-center justify-center rounded-xl border p-6">
                  <div className="bg-card w-full max-w-xs rounded-2xl border p-6 shadow-sm">
                    <div className="mb-4 flex justify-center">
                      {value("logoUrl") ? (
                        // A user-supplied Storage URL. next/image would need
                        // that host in remotePatterns at BUILD time, so a
                        // facility on a different bucket or CDN would break the
                        // preview with a 500 from the optimiser.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={value("logoUrl") as string}
                          alt=""
                          className="h-12 w-auto object-contain"
                        />
                      ) : (
                        <span
                          className="text-2xl font-bold tracking-tight"
                          style={{ color: primary }}
                        >
                          {data?.facilityName ?? "Your facility"}
                        </span>
                      )}
                    </div>
                    <p className="text-center text-xl font-bold">Sign in</p>
                    <p className="text-muted-foreground mt-1 text-center text-sm">
                      {value("tagline") ||
                        `Sign in to ${data?.facilityName ?? "your facility"}.`}
                    </p>
                    <div className="bg-muted mt-5 h-9 rounded-md" />
                    <div className="bg-muted mt-2 h-9 rounded-md" />
                    <div
                      className="mt-3 h-9 rounded-md"
                      style={{ background: primary }}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Approximate — the real page uses your facility&apos;s own web
                  address.
                </p>
              </div>
            </div>
          )}

          {save.isError && (
            <p className="text-destructive text-sm" role="alert">
              {save.error.message}
            </p>
          )}

          <div className="flex items-center gap-3 border-t pt-4">
            <Button
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {save.isPending ? "Saving…" : "Save branding"}
            </Button>
            {dirty && !save.isPending && (
              <Button variant="ghost" onClick={() => setDraft({})}>
                Discard changes
              </Button>
            )}
            {!dirty && save.isSuccess && (
              <span className="text-muted-foreground text-sm">Saved.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
