"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  Signal,
  Smartphone,
  Star,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useAdminTerminals,
  useProbeTerminal,
  useSaveTerminal,
  type AdminTerminal,
  type TerminalProbe,
  type YipyyPayOverview,
} from "@/lib/api/yipyy-pay";
import { TerminalIllustration } from "../illustrations";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The card readers, and the first screen that can actually name one.
//
// ── WHAT THIS FIXES ───────────────────────────────────────────────────────
//
// `public.facility_terminals` and `public.set_default_terminal` have existed
// since 20260808160000 and nothing in the application ever wrote either. So a
// facility with two Flex 4s saw two rows reading "Flex 4", told apart only by a
// fourteen-character serial — and choosing wrong sends a customer's card
// request to a device in another room. The default-terminal feature, which
// makes the ordinary checkout a single press, could not be switched on at all.
//
// ── STATUS IS ASKED FOR, NOT POLLED ───────────────────────────────────────
//
// The spec wants a live online/offline dot on page load. `deviceState()` is a
// round trip to physical hardware: eight seconds for a healthy device, forty
// for one with Cloud Pay Display closed. Three terminals would be a two-minute
// page load that tells you something already out of date by the time you walk
// over.
//
// So the list draws instantly from what the merchant owns, and each card has a
// Check button. Slower to look at, faster to use, and honest about what it
// knows: a card that has not been checked says so rather than guessing.
// ============================================================================

const PROBE_COPY: Record<
  TerminalProbe["kind"],
  { label: string; tone: string; dot: string }
> = {
  ready: {
    label: "deviceOnline",
    tone: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  busy: {
    label: "deviceInUse",
    tone: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  asleep: {
    label: "deviceAppClosed",
    tone: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  unreachable: {
    label: "deviceNotAnswering",
    tone: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

export function DevicesTab({ overview }: { overview: YipyyPayOverview }) {
  const t = useSettingsText().section("yipyy-pay");
  const settingsPath = useSettingsHref();
  const { data, isPending } = useAdminTerminals(overview.connection.connected);
  const [renaming, setRenaming] = useState<AdminTerminal | null>(null);
  const [probes, setProbes] = useState<Record<string, TerminalProbe>>({});
  const [probing, setProbing] = useState<string | null>(null);

  const probe = useProbeTerminal();
  const saveTerminal = useSaveTerminal();

  const check = async (terminal: AdminTerminal) => {
    setProbing(terminal.serial);
    try {
      const result = await probe.mutateAsync(terminal.serial);
      setProbes((prev) => ({ ...prev, [terminal.serial]: result }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("terminalNoAnswer"),
      );
    } finally {
      setProbing(null);
    }
  };

  const act = async (
    terminal: AdminTerminal,
    changes: { isDefault?: boolean; isActive?: boolean },
    message: string,
  ) => {
    try {
      await saveTerminal.mutateAsync({
        serial: terminal.serial,
        // Always sent, because the table requires a name and most devices have
        // no row yet. The model is what the screen was already displaying, so
        // nothing is invented.
        label: terminal.label ?? terminal.model ?? t("cardReader"),
        ...changes,
      });
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("didNotSave"));
    }
  };

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const terminals = data?.kind === "terminals" ? data.terminals : [];

  return (
    <div className="space-y-4">
      {data?.kind === "unreadable" && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-2.5 text-sm/relaxed">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>{t("readersFailed")}</p>
          </div>
        </Card>
      )}

      {terminals.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <TerminalIllustration />
            <div className="space-y-1">
              <p className="font-semibold">{t("noReaderYet")}</p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm/relaxed">
                {t("noReaderYetHelp")}
              </p>
            </div>
            <ConnectDeviceHelp />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {terminals.length} reader{terminals.length === 1 ? "" : "s"} on
              your account. Clover keeps this list — buy or return one there and
              it changes here.
            </p>
            <ConnectDeviceHelp compact />
          </div>

          <div className="space-y-3">
            {terminals.map((terminal) => {
              const state = probes[terminal.serial];
              const copy = state ? PROBE_COPY[state.kind] : null;
              const busy = probing === terminal.serial;

              return (
                <Card
                  key={terminal.serial}
                  className={cn(!terminal.isActive && "opacity-60")}
                >
                  <CardContent className="flex flex-wrap items-start gap-4 p-5">
                    <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl">
                      <Smartphone className="text-muted-foreground size-5" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {terminal.label ?? terminal.model ?? t("cardReader")}
                        </p>
                        {terminal.isDefault && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="size-3" />
                            {t("defaultReader")}
                          </Badge>
                        )}
                        {!terminal.isActive && (
                          <Badge variant="outline">{t("retired")}</Badge>
                        )}
                        {terminal.support === "unsupported" && (
                          <Badge variant="outline" className="text-amber-600">
                            {t("cannotTakePayments")}
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground text-xs">
                        {terminal.model ?? t("unknownModel")} · Serial{" "}
                        <span className="font-[tabular-nums]">
                          ····{terminal.serial.slice(-4)}
                        </span>
                      </p>

                      {overview.locations.length > 1 && (
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                          <MapPin className="size-3" />
                          {overview.locations.find(
                            (l) => l.id === terminal.locationId,
                          )?.name ?? t("unassigned")}
                        </p>
                      )}

                      {/* Only ever states what was actually asked. A card that
                          has not been checked says so — it does not show a
                          hopeful green dot. */}
                      <p className="flex items-center gap-1.5 text-xs">
                        {copy ? (
                          <>
                            <span
                              aria-hidden="true"
                              className={cn("size-1.5 rounded-full", copy.dot)}
                            />
                            <span className={cn("font-medium", copy.tone)}>
                              {t(copy.label)}
                            </span>
                            {state?.detail && (
                              <span className="text-muted-foreground truncate">
                                — {state.detail}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <CircleDot className="text-muted-foreground size-3" />
                            <span className="text-muted-foreground">
                              {t("statusNotChecked")}
                            </span>
                          </>
                        )}
                      </p>

                      {terminal.support === "unsupported" && (
                        <p className="text-muted-foreground text-xs/relaxed">
                          {t("modelNotDrivable")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => check(terminal)}
                        disabled={busy || !terminal.isActive}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Signal className="size-3.5" />
                        )}
                        {busy ? t("checking") : t("check")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenaming(terminal)}
                      >
                        <Pencil className="size-3.5" />
                        {t("rename")}
                      </Button>
                      {terminal.isActive ? (
                        <>
                          {!terminal.isDefault &&
                            terminal.support !== "unsupported" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  act(
                                    terminal,
                                    { isDefault: true },
                                    "That is now the default reader.",
                                  )
                                }
                              >
                                <Star className="size-3.5" />
                                {t("makeDefault")}
                              </Button>
                            )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() =>
                              act(
                                terminal,
                                { isActive: false },
                                "Retired. It will not appear at checkout.",
                              )
                            }
                          >
                            {t("retire")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            act(
                              terminal,
                              { isActive: true },
                              "Back in use at checkout.",
                            )
                          }
                        >
                          <RotateCcw className="size-3.5" />
                          {t("bringBack")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Tips are not synced to a device and cannot be: the terminal asks for
          one during the sale, using the tiers set in Yipyy at that moment.
          Saying so beats a "Sync tips" button that would push nothing. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">{t("tippingAtReader")}</p>
            <p className="text-muted-foreground text-sm/relaxed">
              {t("tippingAtReaderHelp")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={settingsPath("tips")}>
              {t("tipSettings")}
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <RenameDialog
        terminal={renaming}
        locations={overview.locations}
        onClose={() => setRenaming(null)}
        onSave={async (label, locationId) => {
          if (!renaming) return;
          try {
            await saveTerminal.mutateAsync({
              serial: renaming.serial,
              label,
              locationId,
            });
            toast.success(t("saved"));
            setRenaming(null);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : t("didNotSave"),
            );
          }
        }}
        saving={saveTerminal.isPending}
      />
    </div>
  );
}

/**
 * How a new reader appears.
 *
 * There is no pairing flow to build: a Clover device is bound to the merchant
 * account when it is activated, and from that moment it is on this list. So the
 * honest version of "Connect a device" is an explanation, not a wizard that
 * pretends to do something the hardware already did.
 */
function ConnectDeviceHelp({ compact }: { compact?: boolean }) {
  const t = useSettingsText().section("yipyy-pay");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        <Smartphone className="size-4" />
        {t("addReader")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("addingReader")}</DialogTitle>
            <DialogDescription>{t("addingReaderHelp")}</DialogDescription>
          </DialogHeader>

          <ol className="space-y-3">
            {[
              "Buy a Clover Flex, Mini or Compact — those are the models a web app can drive.",
              "Activate it with your merchant account, the way the box describes.",
              "Open Cloud Pay Display on the device and leave it running.",
              "Come back here and refresh. It will be in the list, ready to name.",
            ].map((line, index) => (
              <li key={line} className="flex gap-3">
                <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                  {index + 1}
                </span>
                <span className="text-muted-foreground text-sm/relaxed">
                  {line}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-start gap-2.5 rounded-lg border p-3 text-sm/relaxed">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-muted-foreground">{t("nameReadersHelp")}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("close")}
            </Button>
            <Button asChild>
              <a
                href="https://www.clover.com/pos-hardware"
                target="_blank"
                rel="noreferrer noopener"
              >
                {t("buyReaderShort")}
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** No location, as opposed to "not answered yet" -- Radix Select crashes on
 *  a `""` item value, so this stands in for null in the picker. */
const UNASSIGNED = "__unassigned__";

function RenameDialog({
  terminal,
  locations,
  onClose,
  onSave,
  saving,
}: {
  terminal: AdminTerminal | null;
  locations: { id: string; name: string; isPrimary: boolean }[];
  onClose: () => void;
  onSave: (label: string, locationId: string | null) => void;
  saving: boolean;
}) {
  const t = useSettingsText().section("yipyy-pay");
  const [value, setValue] = useState("");
  // `undefined` means "not touched" (send the current value back unchanged),
  // distinct from `null` meaning "the person picked Unassigned" -- both are
  // reachable via the same Select, so a two-state type can't tell them apart.
  const [locationId, setLocationId] = useState<string | null | undefined>(
    undefined,
  );

  // Seeded when the dialog opens rather than on every render — the dialog is
  // mounted only while a terminal is selected, so `key` gives each one its own
  // fresh state without an effect.
  return (
    <Dialog
      open={Boolean(terminal)}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent key={terminal?.serial} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("nameThisReader")}</DialogTitle>
          <DialogDescription>{t("nameThisReaderHelp")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="terminal-label">{t("name")}</Label>
          <Input
            id="terminal-label"
            autoFocus
            maxLength={60}
            defaultValue={terminal?.label ?? terminal?.model ?? ""}
            placeholder={t("frontDesk")}
            onChange={(event) => setValue(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Serial ····{terminal?.serial.slice(-4)}
          </p>
        </div>

        {locations.length > 1 && (
          <div className="space-y-2">
            <Label htmlFor="terminal-location">{t("location")}</Label>
            <Select
              defaultValue={terminal?.locationId ?? UNASSIGNED}
              onValueChange={(next) =>
                setLocationId(next === UNASSIGNED ? null : next)
              }
            >
              <SelectTrigger id="terminal-location" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>{t("unassigned")}</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              onSave(
                (value || terminal?.label || terminal?.model || "").trim(),
                locationId !== undefined
                  ? locationId
                  : (terminal?.locationId ?? null),
              )
            }
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
